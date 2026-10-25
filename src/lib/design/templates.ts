/**
 * Locally-defined starter templates — plain data, no paid stock assets. The design page turns
 * each spec into real fabric objects; kept as data here so the template set stays unit-testable
 * without a canvas.
 */
export type TemplateObjectSpec =
  | {
      type: "rect";
      left: number;
      top: number;
      width: number;
      height: number;
      fill: string;
      rx?: number;
    }
  | {
      type: "textbox";
      left: number;
      top: number;
      width: number;
      text: string;
      fontSize: number;
      fill: string;
      fontWeight?: string;
      textAlign?: "left" | "center" | "right";
    };

export interface DesignTemplate {
  id: string;
  nameEn: string;
  nameAr: string;
  background: string;
  /** Returns object specs scaled for the given canvas size. */
  build: (width: number, height: number) => TemplateObjectSpec[];
}

export const TEMPLATES: DesignTemplate[] = [
  {
    id: "blank",
    nameEn: "Blank canvas",
    nameAr: "لوحة فارغة",
    background: "#f8f6f2",
    build: () => [],
  },
  {
    id: "quote-card",
    nameEn: "Quote card",
    nameAr: "بطاقة اقتباس",
    background: "#1e2440",
    build: (width, height) => [
      {
        type: "textbox",
        left: width * 0.1,
        top: height * 0.38,
        width: width * 0.8,
        text: "Your quote goes here.",
        fontSize: Math.round(width * 0.06),
        fill: "#f8f6f2",
        fontWeight: "600",
        textAlign: "center",
      },
      {
        type: "textbox",
        left: width * 0.1,
        top: height * 0.62,
        width: width * 0.8,
        text: "— Your Brand",
        fontSize: Math.round(width * 0.03),
        fill: "#a7dad4",
        textAlign: "center",
      },
    ],
  },
  {
    id: "announcement",
    nameEn: "Announcement",
    nameAr: "إعلان",
    background: "#6750d8",
    build: (width, height) => [
      {
        type: "rect",
        left: width * 0.08,
        top: height * 0.08,
        width: width * 0.84,
        height: height * 0.84,
        fill: "#ede8fa",
        rx: 24,
      },
      {
        type: "textbox",
        left: width * 0.15,
        top: height * 0.3,
        width: width * 0.7,
        text: "Big news",
        fontSize: Math.round(width * 0.09),
        fill: "#1e2440",
        fontWeight: "700",
        textAlign: "center",
      },
      {
        type: "textbox",
        left: width * 0.15,
        top: height * 0.5,
        width: width * 0.7,
        text: "Tell your audience what's new.",
        fontSize: Math.round(width * 0.035),
        fill: "#5b5f78",
        textAlign: "center",
      },
    ],
  },
  {
    id: "sale-banner",
    nameEn: "Sale banner",
    nameAr: "لافتة تخفيضات",
    background: "#a7dad4",
    build: (width, height) => [
      {
        type: "textbox",
        left: width * 0.1,
        top: height * 0.35,
        width: width * 0.8,
        text: "SALE",
        fontSize: Math.round(width * 0.14),
        fill: "#1e2440",
        fontWeight: "800",
        textAlign: "center",
      },
      {
        type: "textbox",
        left: width * 0.1,
        top: height * 0.58,
        width: width * 0.8,
        text: "Up to 30% off — this week only",
        fontSize: Math.round(width * 0.035),
        fill: "#1e2440",
        textAlign: "center",
      },
    ],
  },
];

export function getTemplate(id: string): DesignTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
