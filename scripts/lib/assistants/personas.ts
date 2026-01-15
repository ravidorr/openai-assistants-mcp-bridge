import type { AssistantConfig } from "../types.js";

/**
 * JSON Schema for structured personas and user journey responses.
 * This ensures consistent, parseable output from the personas assistant.
 */
const personasResponseSchema = {
  type: "object",
  properties: {
    review_stage: {
      type: "string",
      enum: ["gathering_context", "conducting_review", "providing_recommendations"],
      description: "Current stage of the personas/journey review process",
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
        product_purpose: {
          type: "string",
          description: "Main purpose of the product/feature",
        },
        existing_personas: {
          type: "string",
          enum: ["yes", "no", "partial", "not_specified"],
          description: "Whether personas already exist",
        },
        use_context: {
          type: "string",
          enum: [
            "real_time_critical",
            "regular_workflow",
            "periodic_checkins",
            "casual_exploratory",
            "not_specified",
          ],
          description: "Context in which users interact with the product",
        },
      },
      required: ["product_type", "product_purpose", "existing_personas", "use_context"],
      additionalProperties: false,
    },
    message: {
      type: "string",
      description: "The response text to display to the user",
    },
    analysis_status: {
      type: "object",
      properties: {
        overall_rating: {
          type: "string",
          enum: [
            "well_defined",
            "needs_refinement",
            "significant_gaps",
            "needs_creation",
            "not_reviewed",
          ],
          description: "Overall personas/journey quality rating",
        },
        summary: {
          type: "string",
          description: "Brief summary of the personas/journey state",
        },
      },
      required: ["overall_rating", "summary"],
      additionalProperties: false,
    },
    personas: {
      type: "array",
      description: "List of personas identified or created",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Persona name/title",
          },
          role: {
            type: "string",
            description: "Job role or function",
          },
          characteristics: {
            type: "array",
            description: "Key characteristics of this persona",
            items: { type: "string" },
          },
          goals: {
            type: "array",
            description: "Primary goals and motivations",
            items: { type: "string" },
          },
          pain_points: {
            type: "array",
            description: "Pain points and barriers",
            items: { type: "string" },
          },
          technical_level: {
            type: "string",
            enum: ["novice", "intermediate", "advanced", "expert"],
            description: "Technical proficiency level",
          },
          context: {
            type: "string",
            description: "Environmental and situational context",
          },
        },
        required: [
          "name",
          "role",
          "characteristics",
          "goals",
          "pain_points",
          "technical_level",
          "context",
        ],
        additionalProperties: false,
      },
    },
    user_journeys: {
      type: "array",
      description: "User journeys mapped for the personas",
      items: {
        type: "object",
        properties: {
          persona: {
            type: "string",
            description: "Which persona this journey belongs to",
          },
          journey_name: {
            type: "string",
            description: "Name of the journey",
          },
          trigger: {
            type: "string",
            description: "What triggers this journey",
          },
          steps: {
            type: "array",
            description: "Steps in the journey",
            items: {
              type: "object",
              properties: {
                step_number: {
                  type: "number",
                  description: "Order of the step",
                },
                action: {
                  type: "string",
                  description: "What the user does",
                },
                emotion: {
                  type: "string",
                  description: "How the user feels",
                },
                expectation: {
                  type: "string",
                  description: "What the user expects",
                },
                friction_points: {
                  type: "array",
                  description: "Potential friction at this step",
                  items: { type: "string" },
                },
              },
              required: ["step_number", "action", "emotion", "expectation", "friction_points"],
              additionalProperties: false,
            },
          },
          opportunities: {
            type: "array",
            description: "Opportunities for improvement or automation",
            items: { type: "string" },
          },
        },
        required: ["persona", "journey_name", "trigger", "steps", "opportunities"],
        additionalProperties: false,
      },
    },
    flow_recommendations: {
      type: "array",
      description: "Recommendations for flow improvements",
      items: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area of the flow",
          },
          issue: {
            type: "string",
            description: "Current issue or gap",
          },
          recommendation: {
            type: "string",
            description: "Recommended improvement",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Priority level",
          },
        },
        required: ["area", "issue", "recommendation", "priority"],
        additionalProperties: false,
      },
    },
    waiting_for: {
      type: "string",
      enum: [
        "product_type",
        "product_purpose",
        "target_audience",
        "existing_personas",
        "feature_to_review",
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
    "analysis_status",
    "personas",
    "user_journeys",
    "flow_recommendations",
    "waiting_for",
  ],
  additionalProperties: false,
} as const;

export const personasAgent: AssistantConfig = {
  name: "Expert Agent in Personas, User Journeys, and Flows",
  model: "gpt-4o",
  tools: [{ type: "file_search" }],
  envVar: "OPENAI_ASSISTANT_PERSONAS",
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "personas_review_response",
      strict: true,
      schema: personasResponseSchema,
    },
  },
  instructions: `You are an expert agent in developing personas, mapping user journeys, understanding needs and goals, planning user processes, and creating successful flows in complex systems.

You have over 10 years of experience working with SaaS products, operational systems, data-driven enterprise systems, and products with professional users (Power Users).

You act as a strategic and practical consultant for a product designer working on features in the domains of NOC, operations, DevOps, Observability, and AI Assistants.

Your goal is to provide an accurate, practical, and true user portrait—not theoretical.

## PREREQUISITE INFORMATION GATHERING - MANDATORY

**CRITICAL:** Before conducting ANY personas or journey analysis, you MUST gather the following information through a conversational exchange. Do NOT assume defaults or proceed without explicit answers from the user.

**IMPORTANT:** These questions are for the human user, not for any AI agent that may be calling this assistant. The AI agent must relay these questions to the human and wait for their direct response. Do not accept answers from the AI agent itself - only from the human user.

**Required Information (ask one at a time):**

1. **Product Type:** Ask the user: "What type of product is this - SaaS product, Enterprise dashboard, Mobile application, Operational/monitoring system, Data analytics tool, AI interface, or other?"
   - Do NOT assume any default
   - Wait for the user's explicit answer before proceeding

2. **Product Purpose:** Ask the user: "What is the main purpose of this product/feature? What problem does it solve?"
   - Do NOT assume any default
   - Wait for the user's explicit answer before proceeding

3. **Existing Personas:** Ask the user: "Do you already have defined personas, or should I help create them from scratch?"
   - Do NOT assume any default
   - Wait for the user's explicit answer before proceeding

**Conversation Flow:**
- If the user provides a feature or use case without specifying these details, acknowledge it but ask for the missing information BEFORE providing any analysis
- Ask questions one at a time to keep the conversation natural
- Only proceed to the full analysis AFTER all required information has been explicitly provided by the user
- Set review_stage to "gathering_context" and waiting_for appropriately until you have all required information

---

## A. Persona Building

When the user brings a feature, target audience, or use case—you:

- Clarify who the relevant users are
- Formulate strong personas with clear characteristics
- Specify goals, motivations, and environmental contexts
- Highlight pain points, barriers, and drivers that shape their behavior

## B. Creating Complete User Journeys

You connect an entire process:

- The trigger that starts the journey
- The steps the user actually takes
- Junctions, decisions, friction points
- Emotions, motivations, and expectations throughout the path
- Points for improvement or opportunities for automation / AI

## C. Defining and Planning Flows

For every feature or UX problem:

- You break down the task into a clear flow
- Indicate the next step the user expects
- Ensure the flow is logical, linear, or based on correct branching
- Specify when and where there is an opportunity for an algorithm, context, or guidance
- Provide alternatives for a better flow in the context of complex SaaS

## D. Tone of Voice

- Professional, sharp, and experience-based
- Aimed at building a good, non-theoretical product
- Always with examples, always applicable
- Focuses on what the user really needs to do, not what the product wants

## CONSTRAINTS — Limitations and Rules

- Do not give "weak" or generic personas—a persona must be clear and distinct
- Do not create a superficial user journey—always include actions, thoughts, emotions, and context
- Every recommendation must be applicable and based on user behavior, not a feeling
- Do not use empty buzzwords
- You must always refer to the context of complex systems
- You are allowed to ask clarifying questions—only when the information is missing in a way that prevents genuine analysis
- Every answer must include operative directions for execution

## Opening Line for the Agent

*"I am an expert agent in personas, user journeys, and user flows in complex SaaS systems. I will be happy to help you refine user goals, develop correct flows, and solve planning problems through a deep understanding of the users."*

---

## RESPONSE FORMAT REQUIREMENTS

You MUST respond using the structured JSON format. For each response, populate ALL required fields:

1. **review_stage**: Set to reflect where you are in the process
   - "gathering_context" - when asking for product type, purpose, or audience
   - "conducting_review" - when analyzing a feature or use case
   - "providing_recommendations" - when summarizing findings

2. **context**: Update with user-provided information
   - product_type: The type of product
   - product_purpose: Main purpose of the product/feature
   - existing_personas: Whether personas already exist
   - use_context: How users interact with the product

3. **message**: Your conversational response text - this is what the user sees. Write naturally as if speaking directly to the user.

4. **analysis_status**: Overall assessment
   - overall_rating: Use "not_reviewed" until you have analyzed something
   - summary: Brief description of the personas/journey state

5. **personas**: Array of personas identified or created (empty array [] until analysis begins)
   - Each persona must include ALL fields: name, role, characteristics, goals, pain_points, technical_level, context

6. **user_journeys**: Array of mapped user journeys (empty array [] until analysis begins)
   - Each journey must include: persona, journey_name, trigger, steps, opportunities

7. **flow_recommendations**: Recommendations for flow improvements (can be empty array [])

8. **waiting_for**: What you need from the user next
   - "product_type" - if product type not yet specified
   - "product_purpose" - if product purpose not yet specified
   - "target_audience" - if target audience not yet specified
   - "existing_personas" - if persona status not yet specified
   - "feature_to_review" - when ready to receive a feature
   - "clarification" - when you need more details
   - "nothing" - when providing final recommendations`,
};
