import * as core from '@actions/core'
import * as github from '@actions/github'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function getInputs() {
    const avatarSize = parseInt(core.getInput('avatarSize'), 10)
    const svgWidth = parseInt(core.getInput('svgWidth'), 10)
    return {
      repo: core.getInput('repo') || '/',
      sort: core.getInput('sort') === 'true',
      includeBots: core.getInput('includeBots') === 'true',
      includeCollaborators: core.getInput('includeCollaborators') === 'true',
      collaboratorType: core.getInput('collaboratorType') as
        | 'all'
        | 'direct'
        | 'outside',
      svgName: core.getInput('svgName') || 'contributors',
      svgPath: core.getInput('svgPath') || './',
      svgWidth: isNaN(svgWidth) ? 768 : svgWidth,
      avatarSize: isNaN(avatarSize) ? 64 : avatarSize,
    }
  }

  export async function getUsers(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    options: ReturnType<typeof getInputs>,
  ) {
    const contributorsRes = await octokit.repos.listContributors({
      owner,
      repo,
    })

    const contributors = options.includeBots
      ? contributorsRes.data
      : contributorsRes.data.filter((el) => el.type !== 'Bot')

    if (options.sort) {
      contributors.sort((a, b) => b.contributions - a.contributions)
    }

    core.debug('contributors: ')
    core.debug(JSON.stringify(contributorsRes.data, null, 2))

    const users: {
      name: string
      avatar: string
      url: string
      type: 'contributor' | 'bot' | 'collaborator'
      contributions?: number
    }[] = []

    contributors.forEach(
      ({ login, type, avatar_url, html_url, contributions }) => {
        users.push({
          contributions,
          type: type === 'bot' ? 'bot' : 'contributor',
          name: login,
          avatar: avatar_url,
          url: html_url,
        })
      },
    )

    if (options.includeCollaborators) {
      const { data: collaborators } = await octokit.repos.listCollaborators({
        owner,
        repo,
        affiliation: options.collaboratorType,
      })

      core.debug('collaborators: ')
      core.debug(JSON.stringify(collaborators, null, 2))

      collaborators.forEach(({ login, avatar_url, html_url }) => {
        users.push({
          type: 'collaborator',
          name: login,
          avatar: avatar_url,
          url: html_url,
        })
      })
    }

    return users
  }
}
