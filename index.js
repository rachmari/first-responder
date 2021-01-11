const { GitHub } = require('@actions/github')
const core = require('@actions/core')

async function run () {
  const token = core.getInput('token')
  const team = core.getInput('team')
  const org = core.getInput('org')
  const fullTeamName = `${org}/${team}`
  const since = core.getInput('since') !== ''
    ? core.getInput('since') : '2020-01-01'
  const projectBoard = core.getInput('project-board')
  const columnId = parseInt(core.getInput('project-column'), 10)
  const ignoreTeam = core.getInput('ignore-team')
  const includeReviewRequests = core.getInput('include-review-requests')
  const body = core.getInput('comment-body')
  const ignoreRepos = core.getInput('ignore-repos') !== ''
    ? core.getInput('ignore-repos').split(',').map(x => x.trim()) : []
  const ignoreLabels = core.getInput('ignore-labels') !== ''
    ? core.getInput('ignore-labels').split(',').map(x => x.trim()) : []
  let ignoreAuthors = core.getInput('ignore-authors') !== ''
    ? core.getInput('ignore-authors').split(',').map(x => x.trim()) : []
  let ignoreCommenters = core.getInput('ignore-commenters') !== ''
    ? core.getInput('ignore-commenters').split(',').map(x => x.trim()) : []
  const octokit = new GitHub(token)

  const projectInfo = await getProjectMetaData(projectBoard, org)

  // Create a list of users to ignore in the search query
  let teamMembers = []
  if (ignoreTeam === '') {
    teamMembers = await getTeamLogins(octokit, org, team)
  } else {
    teamMembers = await getTeamLogins(octokit, org, ignoreTeam)
  }
  ignoreAuthors = ignoreAuthors.concat(teamMembers)
  ignoreCommenters = ignoreCommenters.concat(teamMembers)

  // Assemble and run the issue/pull request search query
  const teamMentions = await getTeamMentionsIssues(octokit, org, fullTeamName, ignoreAuthors, ignoreCommenters, since, projectInfo, ignoreRepos, ignoreLabels)
  if (includeReviewRequests === 'true') {
    const teamReviewRequests = await getTeamReviewRequests(octokit, org, fullTeamName, ignoreAuthors, ignoreCommenters, since, projectInfo, ignoreRepos, ignoreLabels)
  }

  if (teamMentions.data.incomplete_results === false) {
    console.log('🌵🌵🌵 All search results were found. 🌵🌵🌵')
  } else {
    console.log('🐢 The search result indicated that results may not be complete. This doesn\'t necessarily mean that all results weren\'t returned. See https://docs.github.com/en/rest/reference/search#timeouts-and-incomplete-results for details.')
  }

  // Get unique issues from the 2 results and combine them into single array
  let issues = {}
  if (includeReviewRequests === 'true') {
    teamMentions.data.items.concat(teamReviewRequests.data.items).forEach( i => {
      // easy way to ensure uniq by key => val all the id
      issues[i.id] = i
    })
    // convert Object to Array
    issues = Object.values(issues)
  } else {
    issues = teamMentions.data.items
  }

  if (issues.length === 0) {
    return 'No new team pings. 💫🦄🌈🦩✨'
  }

  console.log(`🚨 Search query found ${issues.length} issues and prs. 🚨`)

  for (const issue of issues) {
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

async function getTeamMentionsIssues (octokit, org, team, authors, commenters, since, projectBoard, ignoreRepos, ignoreLabels) {
  // Search for open issues in repositories owned by `org`
  // and includes a team mention to `team`
  let query = `per_page=100&q=is%3Aopen+org%3A${org}+team%3A${team}`

  query = query.concat(await buildExceptions(authors, commenters, since, projectBoard, ignoreRepos, ignoreLabels))

  console.log(`🔎 Searh query 🔎 ${query}`)
  return await octokit.request(`GET /search/issues?${query}`)
}

async function getTeamReviewRequests (octokit, org, team, authors, commenters, since, projectBoard, ignoreRepos, ignoreLabels) {
  // Search for open issues in repositories owned by `org`
  // and includes a team mention to `team`
  let query = `per_page=100&q=is%3Aopen+org%3A${org}+team-review-requested%3A${team}`

  query = query.concat(await buildExceptions(authors, commenters, since, projectBoard, ignoreRepos, ignoreLabels))

  console.log(`🔎 Searh query 🔎 ${query}`)
  return await octokit.request(`GET /search/issues?${query}`)
}

async function buildExceptions (authors, commenters, since = '2019-01-01', projectBoard, ignoreRepos, ignoreLabels) {
  let query = ""
  for (const author of authors) {
    query = query.concat(`+-author%3A${author}`)
  }
  for (const commenter of commenters) {
    query = query.concat(`+-commenter%3A${commenter}`)
  }

  // Add the created since date query
  query = query.concat(`+created%3A%3E${since}`)

  // Add ignore repos query
  ignoreRepos.forEach(elem => {
    query = query.concat(`+-repo%3A${elem}`)
  })

  // Add ignore labels query
  ignoreLabels.forEach(elem => {
    query = query.concat(`+-label%3A${elem}`)
  })

  // Ignore issues already on the project board
  const ref = projectBoard.repo !== undefined
    ? `${projectBoard.owner}%2F${projectBoard.repo}` : projectBoard.owner
  query = query.concat(`+-project%3A${ref}%2F${projectBoard.number}`)

  return query
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
