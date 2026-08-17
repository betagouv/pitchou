# Architecture Decision Records

## What is an ADR?

An architecture decision record is a short text file. Each record describes a set of forces and a single decision in response to those forces.

## How and where an ADR should be written ?

We will keep ADRs in the project repository under adr/NNNN-title.md

We should use a Markdown file.

ADRs will be numbered sequentially and monotonically. Numbers will not be reused.

If a decision is reversed, we will keep the old one around, but mark it as superseded. (It's still relevant to know that it was the decision, but is no longer the decision.)

An ADR may be translated. The translation lives in a sibling file that keeps the same number and slug, suffixed with the language code: `adr/NNNN-title.en.md`. Each version links to the other on its second line, so a reader landing on either one can switch. Domain names stay in French without accents in every version, and table and column names are never translated: they have to match the schema the ADR describes.

We will use a format with just a few parts, so each document is easy to digest. The format has just a few parts.

- **Title:** These documents have names that are short noun phrases. For example, "ADR 1: Deployment on Ruby on Rails 3.0.10" or "ADR 9: LDAP for Multitenant Integration"

- **Context:** This section describes the forces at play, including technological, political, social, and project local. These forces are probably in tension, and should be called out as such. The language in this section is value-neutral. It is simply describing facts.

- **Decision:** This section describes our response to these forces. It is stated in full sentences, with active voice. "We will …"

- **Status:** A decision may be "proposed" if the project stakeholders haven't agreed with it yet, or "accepted" once it is agreed. If a later ADR changes or reverses a decision, it may be marked as "deprecated" or "superseded" with a reference to its replacement.

- **Consequences:** This section describes the resulting context, after applying the decision. All consequences should be listed here, not just the "positive" ones. A particular decision may have positive, negative, and neutral consequences, but all of them affect the team and project in the future.

The whole document should be one or two pages long. We will write each ADR as if it is a conversation with a future developer. This requires good writing style, with full sentences organized into paragraphs. Bullets are acceptable only for visual style, not as an excuse for writing sentence fragments. (Bullets kill people, even PowerPoint bullets.)

## Reference

2011 Michael Nygard's article: [https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
