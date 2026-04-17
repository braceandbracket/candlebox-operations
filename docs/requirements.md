# Candle Gift Box Production Builder — Requirements

## Overview

monday.com has seen a massive surge in the corporate candle making gift market. Every company in the space faces the same challenge managing order creation for custom orders. Feedback from 10 prospects confirms a strong market opportunity. Signing most of these prospects within the quarter is the expected outcome if a solution is delivered.

## Problem Definition

- Too much manual labor to distribute work
- Massive lack of visibility for all stakeholders
- Orders are only taken over the phone — **none of the companies want to change this**
- Designers select fragrances from a spreadsheet and write orders on paper
- Orders are then manually added to a spreadsheet for the production manager
- Artisans need to know what recipe to follow for each scent in each sample box of 3 candles

> These luxury candles are artisanal in every scents(!) of the word. Personalized inscriptions ensure customers never forget for whom the candle was made. Ingredients are picked uniquely and fresh to deliver the ultimate farm-to-coffee table experience.

---

## Goals

- Improve the order placement experience
- Provide a platform where designers and manufacturers have greater control and visibility of the production pipeline
- Move away from storing fragrances in a spreadsheet to a more secure, centralized place

---

## Target Personas

| Persona | Role |
|---|---|
| **Candle Designer** | Order Taker |
| **Production Manager** | Project Manager |

---

## Constraints

- No real production constraints — the team can make as many orders as demanded
- Each box can only fit **3 candles**
- No box can have **more or less than 3 different scents**
- The production team does **not** combine production of multiple orders
- No inventory is carried in stock — all orders are produced in isolation

---

## Assets Provided

- Predefined board where all Orders are tracked
- Task template type of candle
- Fragrance Schema (see below)

---

## Functional Requirements

### Must Have

- [ ] A monday board roughly matching **Production Orders**
  - Column names and structure can differ; relevant data must be present
- [ ] **Fragrance API** with the following endpoints:
  - `GET` all fragrances
  - `POST` add a fragrance
  - `PUT` update a fragrance
  - `DELETE` delete a fragrance
  - Storage method is up to the developer
- [ ] **Board View UI** to:
  - Select exactly 3 fragrances per box
  - Select the quantity (number of kits) in the order
  - Submit the order → creates an Item in the monday Production Orders board
- [ ] **At least 1 automation** applied to the board
  - Can be a workflow, a recipe sentence, or a webhook

### Nice to Have

- [ ] Monday **Vibe UI Components** (not the Monday Vibe AI system)
- [ ] Calculate order **SLA** and use a dashboard to report on performance (no-code is acceptable)

### Not in Scope

- Inventory Management

---

## Non-Functional Requirements

- The app must be hosted within the **monday-code platform**
- No additional services beyond a monday.com trial, developer tools, and the API
- Any development tools may be used

---

## Fragrance Schema

```json
{
  "id": "string",          // Unique identifier
  "name": "string",        // Name of the fragrance
  "description": "string", // Description
  "category": "string",    // Category or type
  "created_at": "datetime",
  "updated_at": "datetime",
  "image_url": "string"    // URL for fragrance image
}
```

### Example Fragrance

```json
{
  "id": "12345",
  "name": "Herb Garden",
  "description": "A refreshing fragrance that captures the essence of an aromatic herb garden.",
  "category": "Herbaceous",
  "created_at": "2022-03-15T09:37:22Z",
  "updated_at": "2022-04-20T15:14:56Z",
  "image_url": "https://example.com/herb_garden.jpg"
}
```

---

## Resources

| Resource | Link |
|---|---|
| monday.com sign up | https://auth.monday.com/users/sign_up_new?developer=true |
| Install board assets | https://auth.monday.com/oauth2/authorize?client_id=023be521fd80ba48c54bcf7ab2639b67&response_type=install |
| Monday SDK docs | https://developer.monday.com/apps/docs/introduction-to-the-sdk |
| monday-code docs | https://developer.monday.com/apps/docs/get-started |
| Monday API docs | https://developer.monday.com/api-reference/docs/basics |
| Automations guide | https://support.monday.com/hc/en-us/articles/360001222900 |
| Integration blocks | https://support.monday.com/hc/en-us/articles/14709375878674 |
| Vibe UI system | https://vibe.monday.com/v2/?path=/docs/welcome--docs |
| Vibe Figma file | https://www.figma.com/file/2TAHA7RJ2bETBGN9lVkfWq/UI |
| App developer resources | https://monday.com/appdeveloper/resources |

---

## Submission

- Submit GitHub repo (no API tokens or env variables) to:
  https://forms.monday.com/forms/80e90b9ccbe3b96c744796b49d94d3b6?r=use1
- A customer-facing presentation over Zoom is required after submission
- A technical code review discussion will follow

## Tips

- Be creative — this use-case mimics what you will experience in the role
- The goal is to show you can grasp the developer framework fast, not perfectly
- Questions: ziv@monday.com, chrisba@monday.com, dillonhe@monday.com, josephsa@monday.com
