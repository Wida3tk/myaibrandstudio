import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "./locale-provider";
import { LanguageToggle } from "./language-toggle";

describe("LanguageToggle", () => {
  it("flips document dir/lang between ltr/en and rtl/ar", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LanguageToggle />
      </LocaleProvider>,
    );

    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");

    await user.click(screen.getByRole("button"));

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");

    await user.click(screen.getByRole("button"));

    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
