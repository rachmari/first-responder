# First responder

This action searches for team pings in issues and pull requests in an organization. The issues and pull requests are added to an organization project board. You can add a comment to the issue or pull request letting people know that your team will first respond soon.

# Input parameters

| Name | Description | Required |
|------|-------------|----------|
| `token` | An access token. | Yes |
| `team` | Team name without the organization. For example: `docs-content-ecosystem` | Yes |
| `org` | 'The organization to search for issues.' | Yes |
| `since` | The start date to search for team pings. Forma: {4 digit year}-{month}-{day}. For example: 2020-5-20'. Default: '2020-1-1' | No |
| `project-board` | 'The URL of the project board to place issues and pull requests. Must be an org project board.' | No |
| `project-column` | The id of the column to add issues and pull requests.' | No |
| `ignore-team` | Ignores issues and pull requests authored or commented on by members of this team. By default, the value of `team` is ignored. You can use `ignore-team` to specify a team with more members or a team that does not match the team ping being searched.' | No |
| `ignore-repos` | Repositories to ignore when searching issues and pull requests. You can add more than one repository by using a comma-separated list. Format: {owner}/{repo}. For example: octocat/hello-world' | No |
| `ignore-bot` | Ignores issues and pull requests authored or commented on by this bot account.' | No |
| `comment-body` | A comment added to the issue or pull request.' | No |

## `token`

To read and write organization project boards, you need to use an access token with `repo` and `write:org` acces. Ensure that you add the user that owns the access token to the project board with admin permission. For help creating an access token or managing project board members see the GitHub docs:
- [Creating a personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token#creating-a-token)
- [Managing team access to an organization project board](https://docs.github.com/en/github/setting-up-and-managing-organizations-and-teams/managing-team-access-to-an-organization-project-board) 
- [Managing an individual's acces to an organization project board](https://docs.github.com/en/github/setting-up-and-managing-organizations-and-teams/managing-an-individuals-access-to-an-organization-project-board)


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
        ignore-bot: sprocketbot
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
        ignore-bot: sprocketbot
        comment-body: ':robot: Thanks for the ping to team sprockets! :bellhop_bell: This issue was added to our first-responder project board. A team member will be along shortly to review this issue.'
  
```