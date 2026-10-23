# Phase 1 — Data Model (Firestore)

Modeled multi-tenant from the start (see architecture plan §6) even though v1 auto-creates exactly one
org per user. Paths below use `{curly}` for document IDs.

```
/organizations/{orgId}
    name, createdAt, plan ("free" placeholder for now), ownerUid

  /members/{uid}
      role: "owner" | "editor" | "viewer"
      invitedAt, joinedAt

  /brands/{brandId}
      name, logoAssetPath, voice { tone, doNotUse[], sampleCopy[] }
      audience { description, locales[] }     // e.g. ["ar-SA", "en-US"]
      objectives[]
      memory { facts[], lastUpdatedAt }        // persistent brand memory, structured key facts
      createdAt, updatedAt

    /contentItems/{itemId}
        type: "post" | "hook" | "caption" | "script" | "calendar-note"
        language: "ar" | "en"
        platformTargets[]                      // ["instagram","tiktok",...]
        status: "draft" | "in_review" | "approved" | "scheduled" | "published"
        body, structuredPayload                // structured fields (hook/caption/CTA) when applicable
        generation { provider, promptVersion, model, costEstimate, generatedAt }
        createdBy, createdAt, updatedAt

    /calendarEntries/{entryId}
        contentItemId, platform, scheduledFor, publishStatus
        createdAt, updatedAt

    /assets/{assetId}
        storagePath, kind: "image" | "video" | "template"
        tags[], createdBy, createdAt

    /templates/{templateId}
        name, basedOnAssetId, editableFields[]

    /approvals/{approvalId}
        contentItemId, requestedBy, reviewers[]
        comments[] { uid, text, createdAt }
        decision: "pending" | "approved" | "changes_requested"

    /analyticsSnapshots/{snapshotId}
        platform, contentItemId, metrics { impressions, likes, comments, shares, saves }
        pulledAt

/users/{uid}
    displayName, email, defaultOrgId, createdAt

/usage/{orgId}/{yyyymm}/{entryId}             // written only by Cloud Functions (Admin SDK)
    provider, brandId, contentItemId
    tokensIn, tokensOut, costEstimate, success, createdAt

/providerConfigs/{providerId}                 // written only by Cloud Functions / admin tooling
    enabled, priority, supports[], rateLimit { rpm, rpd, tpm }
    // no secrets here — keys live in Secret Manager, this is routing metadata only

/auditLogs/{logId}                            // written only by Cloud Functions
    orgId, uid, action, targetRef, createdAt
```

## Security rule intent (enforced in `firestore.rules`, implemented in Phase 3)

- Every read/write under `/organizations/{orgId}/**` requires
  `request.auth.token.orgId == orgId` (custom claim) **and** a matching `/members/{uid}` doc with a
  role that permits the action (viewers read-only; editors create/update content but not org
  settings; owners do everything including membership changes).
- `/usage/**`, `/providerConfigs/**`, and `/auditLogs/**` have **no client write rule at all** — only
  the Admin SDK (which bypasses rules) can write them. Clients may be granted read access to their own
  org's `/usage` for the budget meter, nothing else.
- `/users/{uid}` is readable/writable only by that same `uid`.

## Why this shape

- Org as the root keeps every future multi-tenant feature (invites, billing, roles) a sub-tree under a
  node that already exists, instead of a migration.
- `generation` metadata on every content item makes the AI gateway's cost/provider choices auditable
  per piece of content, which both the budget system (§5 of the architecture plan) and future debugging
  need.
- Separating `calendarEntries` from `contentItems` lets one piece of content be rescheduled or
  re-targeted at a different platform without rewriting the content document itself.
