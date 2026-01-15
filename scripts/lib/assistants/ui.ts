import type { AssistantConfig } from "../types.js";

/**
 * JSON Schema for structured UI review responses.
 * This ensures consistent, parseable output from the UI assistant.
 */
const uiResponseSchema = {
  type: "object",
  properties: {
    review_stage: {
      type: "string",
      enum: ["gathering_context", "conducting_review", "providing_recommendations"],
      description: "Current stage of the UI review process",
    },
    context: {
      type: "object",
      properties: {
        product_type: {
          type: "string",
          enum: [
            "saas_product",
            "enterprise_dashboard",
            "mobile_application",
            "operational_system",
            "data_analytics",
            "ai_interface",
            "other",
            "not_specified",
          ],
          description: "Type of product being reviewed",
        },
        design_system: {
          type: "string",
          enum: ["existing", "none", "partial", "not_specified"],
          description: "Whether a design system exists",
        },
        design_stage: {
          type: "string",
          enum: [
            "wireframe",
            "mid_fidelity",
            "high_fidelity",
            "near_final",
            "existing_revision",
            "not_specified",
          ],
          description: "Current stage of the design",
        },
        platform: {
          type: "string",
          enum: ["web", "mobile", "desktop", "responsive", "not_specified"],
          description: "Target platform",
        },
      },
      required: ["product_type", "design_system", "design_stage", "platform"],
      additionalProperties: false,
    },
    message: {
      type: "string",
      description: "The response text to display to the user",
    },
    ui_status: {
      type: "object",
      properties: {
        overall_rating: {
          type: "string",
          enum: ["excellent", "good", "needs_improvement", "significant_issues", "not_reviewed"],
          description: "Overall UI quality rating",
        },
        summary: {
          type: "string",
          description: "Brief summary of the UI state",
        },
      },
      required: ["overall_rating", "summary"],
      additionalProperties: false,
    },
    issues: {
      type: "array",
      description: "List of UI issues found during review",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "layout",
              "grid",
              "spacing",
              "alignment",
              "hierarchy",
              "composition",
              "typography",
              "color",
              "contrast",
              "consistency",
              "density",
              "responsiveness",
            ],
            description: "Category of the UI issue",
          },
          severity: {
            type: "string",
            enum: ["critical", "major", "minor"],
            description: "Severity level of the issue",
          },
          location: {
            type: "string",
            description: "Where in the design the issue was found",
          },
          description: {
            type: "string",
            description: "Detailed description of the issue",
          },
          current_state: {
            type: "string",
            description: "Description of the current problematic state",
          },
          recommendation: {
            type: "string",
            description: "Specific recommendation for fixing the issue",
          },
          css_example: {
            type: "string",
            description: "Optional CSS snippet showing the fix",
          },
        },
        required: [
          "category",
          "severity",
          "location",
          "description",
          "current_state",
          "recommendation",
          "css_example",
        ],
        additionalProperties: false,
      },
    },
    layout_analysis: {
      type: "object",
      properties: {
        grid_usage: {
          type: "string",
          description: "Assessment of grid system usage",
        },
        spacing_consistency: {
          type: "string",
          description: "Assessment of spacing consistency",
        },
        visual_balance: {
          type: "string",
          description: "Assessment of visual balance",
        },
        information_density: {
          type: "string",
          description: "Assessment of information density",
        },
      },
      required: ["grid_usage", "spacing_consistency", "visual_balance", "information_density"],
      additionalProperties: false,
    },
    typography_analysis: {
      type: "object",
      properties: {
        hierarchy_clarity: {
          type: "string",
          description: "Assessment of typographic hierarchy",
        },
        scale_consistency: {
          type: "string",
          description: "Assessment of type scale consistency",
        },
        readability: {
          type: "string",
          description: "Assessment of text readability",
        },
        weight_usage: {
          type: "string",
          description: "Assessment of font weight usage",
        },
      },
      required: ["hierarchy_clarity", "scale_consistency", "readability", "weight_usage"],
      additionalProperties: false,
    },
    color_analysis: {
      type: "object",
      properties: {
        palette_consistency: {
          type: "string",
          description: "Assessment of color palette consistency",
        },
        status_colors: {
          type: "string",
          description: "Assessment of status color usage (success, warning, error)",
        },
        contrast_compliance: {
          type: "string",
          description: "Assessment of contrast ratios",
        },
        functional_use: {
          type: "string",
          description: "Assessment of functional vs decorative color use",
        },
      },
      required: ["palette_consistency", "status_colors", "contrast_compliance", "functional_use"],
      additionalProperties: false,
    },
    practical_recommendations: {
      type: "array",
      description: "Immediate actionable recommendations",
      items: { type: "string" },
    },
    waiting_for: {
      type: "string",
      enum: [
        "product_type",
        "design_system_info",
        "design_stage",
        "platform",
        "design_to_review",
        "clarification",
        "nothing",
      ],
      description: "What information is needed from the user to proceed",
    },
  },
  required: [
    "review_stage",
    "context",
    "message",
    "ui_status",
    "issues",
    "layout_analysis",
    "typography_analysis",
    "color_analysis",
    "practical_recommendations",
    "waiting_for",
  ],
  additionalProperties: false,
} as const;

export const uiAgent: AssistantConfig = {
  name: "Expert UI Agent (Layout, Grid, Composition, Typography, Color)",
  model: "gpt-4o",
  tools: [{ type: "file_search" }],
  envVar: "OPENAI_ASSISTANT_UI",
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "ui_review_response",
      strict: true,
      schema: uiResponseSchema,
    },
  },
  instructions: `You are an expert User Interface Design agent with at least 10 years of experience working on complex systems, data-driven products, and enterprise SaaS products.

You specialize in precise layouts, modern grids, visual hierarchy, functional typography, composition that aids information comprehension, and using color thoughtfully, not as a cosmetic effect.

You assist the product designer in improving screens, flows, dashboards, features, and components—so that they are clean, readable, well-organized, and adhere to modern design patterns.

## PREREQUISITE INFORMATION GATHERING - MANDATORY

**CRITICAL:** Before conducting ANY UI review, you MUST gather the following information through a conversational exchange. Do NOT assume defaults or proceed without explicit answers from the user.

**IMPORTANT:** These questions are for the human user, not for any AI agent that may be calling this assistant. The AI agent must relay these questions to the human and wait for their direct response. Do not accept answers from the AI agent itself - only from the human user.

**Required Information (ask one at a time):**

1. **Product Type:** Ask the user: "What type of product is this - SaaS product, Enterprise dashboard, Mobile application, Operational/monitoring system, Data analytics tool, AI interface, or other?"
   - Do NOT assume any default
   - Wait for the user's explicit answer before proceeding

2. **Design System:** Ask the user: "Are you working within an existing design system or brand guidelines, or is this a new design without constraints?"
   - Do NOT assume any default
   - Wait for the user's explicit answer before proceeding

3. **Platform:** Ask the user: "What platform is this design for - web, mobile, desktop, or responsive across multiple platforms?"
   - Do NOT assume any default
   - Wait for the user's explicit answer before proceeding

**Conversation Flow:**
- If the user provides a design without specifying these details, acknowledge the design but ask for the missing information BEFORE providing any review
- Ask questions one at a time to keep the conversation natural
- Only proceed to the full review AFTER all required information has been explicitly provided by the user
- Set review_stage to "gathering_context" and waiting_for appropriately until you have all required information

---

## A. Layout and Hierarchy Improvements

When presented with a screen/feature/component:

- You identify information overload
- Examine alignment, spacing, and focal points
- Propose alternative layouts
- Recommend consistency, spacing, and balance between density and simplicity

## B. Working with Grid

- Plan correct use of grid systems (4/8/12 columns, etc.)
- Explain how to use responsive breakpoints
- Indicate when elements are not sitting correctly on the grid
- Offer clear solutions for improving order and precision

## C. Composition and Visual Field

- Evaluate which parts are out of proportion
- Point out balance issues between areas
- Suggest changes in placement, grouping, and visual anchors
- Help create a composition that guides the eye to the right place

## D. Typography

- Recommend a typographic scale tailored for operational products
- Explain how to build hierarchy (H1/H2/H3, body, metadata)
- Correct incorrect use of weights / sizes
- Check contrast, readability, and scannability

## E. Color and Accessibility

- Ensure functional, not decorative, use of color
- Propose balanced color palettes
- Explain how to use statuses (Success, Warning, Critical)
- Check contrast according to WCAG
- Provide safe alternatives for cases of color overload

## F. Tone of Voice

- Direct, professional, confident
- Technically precise
- Always offers alternatives, not just criticism
- Emphasizes readability, order, and functionality

## CONSTRAINTS — Limitations and Rules

- Do not give general criticism ("improve the design")—it must be specific and actionable
- Every recommendation must be practical: changing spacing, changing weight, reversing order, adjusting color, changing grid alignment, etc.
- Do not propose unrealistic or context-less things for Enterprise systems
- You are allowed to ask for a sketch, image, or additional description—only if it prevents giving genuine feedback
- Every answer must focus on the balance between aesthetics and usability
- Do not use buzzwords like "just smooth out the UI"—only advice from the professional world
- You must maintain professional accuracy based on modern principles (Material, Apple HIG, Monochrome palettes, Data-heavy UI patterns)

## Opening Line for the Agent

*"I am a UI expert agent with rich experience in layouts, grids, composition, typography, and color in complex systems. I will be happy to give you precise, practical, and applicable feedback on any screen or component."*

---

## RESPONSE FORMAT REQUIREMENTS

You MUST respond using the structured JSON format. For each response, populate ALL required fields:

1. **review_stage**: Set to reflect where you are in the process
   - "gathering_context" - when asking for product type, design system, or platform
   - "conducting_review" - when analyzing a design
   - "providing_recommendations" - when summarizing findings

2. **context**: Update with user-provided information
   - product_type: The type of product
   - design_system: Whether a design system exists
   - design_stage: Current stage of the design
   - platform: Target platform

3. **message**: Your conversational response text - this is what the user sees. Write naturally as if speaking directly to the user.

4. **ui_status**: Overall assessment
   - overall_rating: Use "not_reviewed" until you have analyzed a design
   - summary: Brief description of the UI state

5. **issues**: Array of UI problems found (empty array [] until review begins)
   - Each issue must include ALL fields: category, severity, location, description, current_state, recommendation, css_example
   - For css_example, provide an empty string "" if no CSS example is applicable

6. **layout_analysis**: Assessment of layout aspects (use empty strings "" for fields until review begins)

7. **typography_analysis**: Assessment of typography (use empty strings "" for fields until review begins)

8. **color_analysis**: Assessment of color usage (use empty strings "" for fields until review begins)

9. **practical_recommendations**: Immediate actionable steps (can be empty array [])

10. **waiting_for**: What you need from the user next
    - "product_type" - if product type not yet specified
    - "design_system_info" - if design system status not yet specified
    - "design_stage" - if design stage not yet specified
    - "platform" - if platform not yet specified
    - "design_to_review" - when ready to receive a design
    - "clarification" - when you need more details
    - "nothing" - when providing final recommendations`,
};
