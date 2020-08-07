const { GitHub } = require('@actions/github')
const core = require('@actions/core')

async function run () {
  const token = core.getInput('token')
  const team = core.getInput('team')
  const org = core.getInput('org')
  const fullTeamName = `${org}/${team}`
  const since = core.getInput('since')
  const projectBoard = core.getInput('project-board')
  const columnId = parseInt(core.getInput('project-column'), 10)
  const ignoreTeam = core.getInput('ignore-team')
  const ignoreBot = core.getInput('ignore-bot')
  const body = core.getInput('comment-body')
  const ignoreRepos = core.getInput('ignore-repos').split(',').map(x => x.trim())
  const octokit = new GitHub(token)

  const projectInfo = await getProjectMetaData(projectBoard, org)

  // Create a list of users to ignore in the search query
  let logins = ''
  if (ignoreTeam === '') {
    logins = await getTeamLogins(octokit, org, team)
  } else {
    logins = await getTeamLogins(octokit, org, ignoreTeam)
  }
  if (ignoreBot !== '') logins.push(ignoreBot)

  // Assemble and run the issue/pull request search query
  const issues = await getTeamPingIssues(octokit, org, fullTeamName, logins, since, projectInfo, ignoreRepos)

  if (issues.data.incomplete_results === false) {
    console.log('🌵🌵🌵 All search results were found. 🌵🌵🌵')
  } else {
    console.log('🐢 The search result indicated that results may not be complete. This doesn\'t necessarily mean that all results weren\'t returned. See https://docs.github.com/en/rest/reference/search#timeouts-and-incomplete-results for details.')
  }

  if (issues.data.items.length === 0) {
    return 'No new team pings. 💫🦄🌈🦩✨'
  }

  console.log(`🚨 Search query found ${issues.data.items.length} issues and prs. 🚨`)

  for (const issue of issues.data.items) {
    let [, , , owner, repo, contentType, number] = issue.html_url.split('/')
    contentType = contentType === 'issues' ? 'Issue' : 'PullRequest'
    await addProjectCard(octokit, owner, repo, number, contentType, columnId)

    if (body !== '') {
      const comment = await octokit.issues.createComment({
        issue_number: number,
        owner: owner,
        repo: repo,
        body: body
      })
      if (comment.status !== 201) {
        throw new Error(`Unable to create a comment in #${issue.html_url} - ${comment.status}.`)
      }
    }
  }
  return '🏁⛑'
}

async function getTeamPingIssues (octokit, org, team, members, since = '2019-01-01', projectBoard, ignoreRepos) {
  // Search for open issues in repositories owned by `org`
  // and includes a team mention to `team`
  let query = `q=is%3Aopen+org%3A${org}+team%3A${team}`
  for (const member of members) {
    query = query.concat(`+-commenter%3A${member}+-author%3A${member}`)
  }

  // Add the created since date query
  query = query.concat(`+created%3A%3E${since}`)

  // Add ignore repos query
  ignoreRepos.forEach(elem => {
    query = query.concat(`+-repo%3A${elem}`)
  })

  // Ignore issues alrady on the project board
  const ref = projectBoard.repo !== undefined
    ? `${projectBoard.owner}%2F${projectBoard.repo}` : projectBoard.owner
  query = query.concat(`+-project%3A${ref}%2F${projectBoard.number}`)

  console.log(`🔎 Searh query 🔎 ${query}`)
  return await octokit.request(`GET /search/issues?${query}`)
}

async function getProjectMetaData (projectUrl, org) {
  const projectAttr = projectUrl.split('/')

  if (projectAttr[3] === 'orgs') {
    return { owner: projectAttr[4], number: parseInt(projectAttr[6], 10) }
  } else if (projectAttr[3] === org) {
    return { owner: projectAttr[3], number: parseInt(projectAttr[6], 10), repo: projectAttr[4] }
  } else {
    return console.log(`The project URL format is malformed and won't be included: ${projectUrl}`)
  }
}

async function addProjectCard (octokit, owner, repo, number, contentType, columnId) {
  let contentRef = ''
  if (contentType === 'Issue') {
    contentRef = await octokit.issues.get({
      owner: owner,
      repo: repo,
      issue_number: number
    })
  } else {
    contentRef = await octokit.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: number
    })
  }
  const res = await octokit.projects.createCard({
    column_id: columnId,
    content_id: contentRef.data.id,
    content_type: contentType
  })

  if (res.status !== 201) {
    throw new Error(`Unable to create a project card for ${contentRef} - ${res.status}.`)
  }

  return console.log(`🔖 Successfully created a new card in column #${columnId} for ${contentType} #${number} from ${owner}/${repo}!`)
}

async function getTeamLogins (octokit, org, team) {
  const teamMembers = await octokit.teams.listMembersInOrg({
    org: org,
    team_slug: team
  })
  return teamMembers.data.map(member => member.login)
}

run()
  .then(
    (response) => { console.log(`Finished running: ${response}`) },
    (error) => {
      console.log(`#ERROR# ${error}`)
      process.exit(1)
    }
  )
