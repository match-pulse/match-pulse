# Release Workflow

## Overview

The Release Workflow turns an accepted, CI-green state of `main` into an
immutable, documented release. It separates **execution tracking** (GitHub
Projects, issues and pull requests) from **release history** (`CHANGELOG.md`,
tags and GitHub Releases).

A release is a coherent milestone, not every merge. The workflow exists so tags
mean something: a tag is a snapshot that another person can identify, reproduce
and trust, with release notes that explain what changed and what remains open.

## Roles

- **Human Developer — Decision Owner:** approves the release, the version, the
  release notes, the tag and the GitHub Release.
- **Orchestrator:** prepares the release section, checks the record chain and
  coordinates the release commit.
- **Test Engineer / Release & Operations Verifier:** confirms the release
  checks, migrations, rollback notes and known gaps.
- **Security & Privacy Reviewer:** reviews security-relevant release notes and
  residual risks.
- **Implementation Agent:** makes only the approved release-preparation changes
  (changelog, version, release notes); it does not tag or publish without
  authorization.

## Versioning

Use Semantic Versioning:

```text
vMAJOR.MINOR.PATCH[-rc.N]
```

- **MAJOR** — breaking API, schema, data or user-visible contract change.
- **MINOR** — backward-compatible feature or security capability.
- **PATCH** — backward-compatible fix.
- **Pre-release** — `-rc.N` for a checkpoint or release candidate.
- Do not use build metadata unless a concrete need exists.

For a local course project, a schema change with a required reset may still be
released as a MINOR if there are no external consumers; record the migration
explicitly. If the database/API contract is treated as public, use MAJOR.

`package.json` must match the release version at release time. The tag is the
authoritative version identifier; a stale package version must not be released.

## Changelog

`CHANGELOG.md` records notable user-facing or developer-facing changes grouped
by release. It is not a per-PR ledger.

Include:

- behaviour, API, schema, migration or contract changes;
- security and privacy controls;
- delivery, observability and operational changes;
- breaking changes and deprecations;
- notable fixes;
- contributor workflow changes that affect how people work.

Exclude routine documentation, test-only changes, chores, internal refactors and
dependency bumps unless they change a contract, a risk or contributor workflow.
Group related changes and link the headline issue, PR, ADR or verification
record. The pre-policy PR table in `CHANGELOG.md` is frozen and is not updated.

## Workflow Stages

1. **Release candidate.** The human selects a coherent milestone on `main`.
   Confirm that all intended issues/PRs are merged and no conflicting work is
   open.
2. **Freeze the changelog.** Curate the `Unreleased` section under `Added`,
   `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security` and
   `Migration / upgrade notes`. Remove entries that are not notable.
3. **Align the version.** Set `package.json` to the release version. Confirm the
   tag name and version match (`1.1.0` ↔ `v1.1.0`).
4. **Record the release conditions.** Document migrations, environment changes,
   data resets, rollback/recovery steps, known gaps and residual risks. Link the
   verification record and AI transparency entry.
5. **Verify `main`.** Confirm CI is green on the release commit and that the
   build, tests and migration replay pass. A green PR is not enough if `main`
   has moved.
6. **Commit release preparation.** Use a Conventional Commit such as
   `chore(release): v1.1.0`. Include only the release section, version and
   release-note changes.
7. **Tag.** Create an annotated tag on the release commit:
   `git tag -a v1.1.0 -m "v1.1.0"`. Never tag a feature branch or PR head.
8. **Publish.** Push `main` and the tag. Create a GitHub Release from the tag,
   using the changelog section as the notes. Mark `-rc.N` as a pre-release.
9. **Verify and close.** Confirm the tag, release, changelog links and CI. Close
   the release milestone. Move the project items to Release & Learn.
10. **Start the next cycle.** Open a fresh `Unreleased` section; do not edit the
    released section.

## Human Decision Gates

The human approves the release version, the changelog content, migration and
rollback notes, the release commit, the tag, the GitHub Release and any
pre-release designation. A green CI run is evidence, not release approval.
Tags are immutable: a bad release gets a new PATCH tag, not a moved or deleted
tag. `v*` tags should be protected against deletion and updates.

## Workflow Principles

- **Release history is curated.** The changelog explains what shipped; GitHub
  issues and PRs explain how it was built.
- **Tags are releases, not bookmarks.** Do not tag every merge or every day.
- **One release, one immutable snapshot.** Tag the exact commit that was
  verified.
- **Migration notes are part of the release.** A reset, schema change or
  environment change must be visible before the tag.
- **The release section is append-only after publication.** Corrections are new
  release notes or a new patch release.
- **No unreviewed release.** The human accepts the release; the release
  verifier confirms the evidence.
- **No silent residual risk.** Known gaps and accepted risks are linked from the
  release notes.

## Release Checklist

```text
[ ] Milestone selected; intended issues/PRs merged
[ ] Unreleased section curated and complete
[ ] package.json version matches the tag
[ ] Migration / reset / environment notes recorded
[ ] Rollback and recovery notes recorded
[ ] Known gaps and residual risks linked
[ ] CI green on main at the release commit
[ ] Release commit created (chore(release): vX.Y.Z)
[ ] Annotated tag created on the release commit
[ ] main and tag pushed
[ ] GitHub Release created from the tag
[ ] Tag protection verified
[ ] Changelog compare links verified
[ ] Milestone closed; board items moved
[ ] New Unreleased section opened
```

## Expected Outcome

A release that another person can identify, reproduce and understand: an
immutable tag, a GitHub Release, a curated changelog section, explicit
migration/rollback notes and a traceable link to the evidence. The project board
remains the execution record; the changelog remains the permanent release
history.
