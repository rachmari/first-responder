# First responder

This action searches for team pings in issues and pull requests in an organization and outputs a JSON stringified list of the URLs of any items that were found.

If you specify an organization project board, the items will also be added to the board. This only works for projects classic, not for projects v2.

You can specify `comment-body` to add a comment to the issue or pull request letting people know that your team will first respond soon.

# Input parameters

- `token`: **Required:** An access token.
- `team`: **Required:** The team ping to search for that is part of the `org` specified below. Do not include the org name (for example, use `docs-content-ecosystem`). Issues and pull requests authored or commented on by members of `team` are ignored unless you specify an alternate `ignore-team` parameter.
- `org`: **Required:** The organization where the action should search for issues and pull requests.
- `since`: The start date to search for team pings. The action searches for issues or pull requests created since the date specified. Form: {4 digit year}-{month}-{day}. For example: '2020-5-20'
- `project-board`: The URL of the project board to place issues and pull requests. Must be an org project board.
- `project-column`: The id of the column to add issues and pull requests.
- `ignore-team`: Ignores issues and pull requests authored or commented on by members of this team. Issues and pull requests authored or commented on by members of `team` are ignored unless you specify an alternate `ignore-team` parameter. You can use `ignore-team` to specify a larger team or a team that does not match the team ping being searched. The value you specify for `ignore-team` overrides the `team` value.
- `include-repos`: Repositories to include when searching issues and pull requests. You can add more than one repository by using a comma-separated list. Format: {owner}/{repo}. For example: 'octocat/hello-world, octocat/foobar'. Note: This cannot be used with `ignore-repos`.
- `ignore-repos`: Repositories to ignore when searching issues and pull requests. You can add more than one repository by using a comma-separated list. Format: {owner}/{repo}. For example: 'octocat/hello-world, octocat/foobar'. Note: This cannot be used with `include-repos`.
- `ignore-authors`: Ignores issues and pull requests authored by these accounts. You can add more than one repository by using a comma-separated list (for example, 'actions-bot, hubot')
- `ignore-commenters`: Ignores issues and pull requests commented by thee accounts. You can add more than one repository by using a comma-separated list (for example, 'actions-bot, hubot')
- `comment-body`: A comment added to the issue or pull request.

## `token`

To read and write organization project boards, you need to use an access token with `repo` and `write:org` access. Ensure that you add the user that owns the access token to the project board with admin permission. For help creating an access token or managing project board members see the GitHub docs:
- [Creating a personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token#creating-a-token)
- [Managing team access to an organization project board](https://docs.github.com/en/github/setting-up-and-managing-organizations-and-teams/managing-team-access-to-an-organization-project-board)
- [Managing an individual's access to an organization project board](https://docs.github.com/en/github/setting-up-and-managing-organizations-and-teams/managing-an-individuals-access-to-an-organization-project-board)


## Example workflow

This workflow includes two team pings and runs every hour and can also be run manually.

```yml
name: First responder triage
on:
  workflow_dispatch:
  schedule:
    - cron:  '0 * * * *'

jobs:
  first-responder-product:
    name: Spacely product team pings
    runs-on: ubuntu-latest

    steps:
    - name: Get team pings for Spacely product division
      uses: rachmari/first-responder@v1.0.0
      with:
        token: ${{secrets.FR_ACCESS_TOKEN}}
        team: 'spacely-product'
        org: 'spacelysprocketsinc'
        since: '2020-08-05'
        project-board: 'https://github.com/orgs/spacelysprocketsinc/projects/1'
        project-column: 9
        ignore-repos: 'spacelysprocketsinc/product-spacely, spacelysprocketsinc/product-spacely-sprockets'
        ignore-authors: 'sprocketbot, github-actions'
        ignore-commenters: 'sprocketbot'
        comment-body: ':rocket: Thanks for the ping! :bellhop_bell: This issue was added to our first-responder project board. A team member will be along shortly to review this issue.'

  first-responder-product-subteam:
    name: Spacely product sprockets pings
    runs-on: ubuntu-latest

    steps:
    - name: Get team pings for Spacely sprockets product division
      uses: rachmari/first-responder@v1.0.0
      with:
        token: ${{secrets.FR_ACCESS_TOKEN}}
        team: 'spacely-sprockets-product'
        org: 'spacelysprocketsinc'
        since: '2020-08-05'
        project-board: 'https://github.com/orgs/spacelysprocketsinc/projects/1'
        project-column: 10
        ignore-repos: 'spacelysprocketsinc/product-spacely, spacelysprocketsinc/product-spacely-sprockets'
        ignore-authors: 'sprocketbot, github-actions'
        ignore-commenters: 'sprocketbot'
        comment-body: ':robot: Thanks for the ping to team sprockets! :bellhop_bell: This issue was added to our first-responder project board. A team member will be along shortly to review this issue.'

```

# Would you like to contribute?

To get started read the [Contributing](./CONTRIBUTING.md) docs.
