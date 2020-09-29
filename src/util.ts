import * as core from '@actions/core'
import * as github from '@actions/github'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function getInputs() {
    const svgWidth = parseInt(core.getInput('svgWidth'), 10)
    const avatarSize = parseInt(core.getInput('avatarSize'), 10)
    const avatarMargin = parseInt(core.getInput('avatarMargin'), 10)
    const userNameHeight = parseInt(core.getInput('userNameHeight'), 10)
    return {
      repo: core.getInput('repo') || '/',
      sort: core.getInput('sort') === 'true',
      includeBots: core.getInput('includeBots') === 'true',
      affiliation: core.getInput('affiliation') as 'all' | 'direct' | 'outside',
      svgPath: core.getInput('svgPath') || './contributors.svg',
      svgTemplate: core.getInput('svgTemplate'),
      itemTemplate: core.getInput('itemTemplate'),
      commitMessage: core.getInput('commitMessage'),
      svgWidth: isNaN(svgWidth) ? 740 : svgWidth,
      avatarSize: isNaN(avatarSize) ? 64 : avatarSize,
      avatarMargin: isNaN(avatarMargin) ? 5 : avatarMargin,
      userNameHeight: isNaN(userNameHeight) ? 0 : userNameHeight,
    }
  }

  export async function getFileContent(
    octokit: ReturnType<typeof getOctokit>,
    path: string,
  ) {
    try {
      const response = await octokit.repos.getContent({
        ...github.context.repo,
        path,
      })

      const content = response.data.content
      return Buffer.from(content, 'base64').toString()
    } catch (err) {
      return null
    }
  }

  export function calcSectionHeight(
    total: number,
    options: ReturnType<typeof getInputs>,
  ) {
    const svgWidth = options.svgWidth
    const avatarMargin = options.avatarMargin
    const avatarWidth = options.avatarSize
    const avatarHeight = options.avatarSize
    const itemWidth = avatarWidth + 2 * avatarMargin
    const itemHeight = avatarHeight + 2 * avatarMargin
    const colCount = Math.floor(svgWidth / itemWidth)

    return itemHeight * Math.ceil(total / colCount)
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

    const { data: collaborators } = await octokit.repos.listCollaborators({
      owner,
      repo,
      affiliation: options.affiliation,
    })

    const contributors = options.includeBots
      ? contributorsRes.data
      : contributorsRes.data.filter((el) => el.type !== 'Bot')
    const bots = contributorsRes.data.filter((el) => el.type === 'Bot')

    if (options.sort) {
      contributors.sort((a, b) => b.contributions - a.contributions)
      bots.sort((a, b) => b.contributions - a.contributions)
    }

    const getBBox = (index: number) => {
      const svgWidth = options.svgWidth
      const avatarMargin = options.avatarMargin
      const avatarWidth = options.avatarSize
      const avatarHeight = options.avatarSize
      const colCount = Math.floor(svgWidth / (avatarWidth + 2 * avatarMargin))
      const colIndex = index % colCount
      const rowIndex = Math.floor(index / colCount)

      return {
        x: avatarMargin + colIndex * (avatarWidth + avatarMargin),
        y: avatarMargin + rowIndex * (avatarHeight + avatarMargin),
        width: avatarWidth,
        height: avatarHeight,
      }
    }

    const format = (user: any) => ({
      name: user.login,
      avatar: user.avatar_url,
      url: user.html_url,
    })

    const res = await octokit.request(
      'GET https://avatars0.githubusercontent.com/u/6045824?v=4',
      {
        mediaType: {
          format: 'application/vnd.github.VERSION+json',
        },
      },
    )

    console.log(res)

    return {
      contributors: contributors.map((user, i) => ({
        ...getBBox(i),
        ...format(user),
        type: user.type === 'Bot' ? 'bot' : 'contributor',
      })),
      bots: bots.map((user, i) => ({
        ...getBBox(i),
        ...format(user),
        type: 'bot',
      })),
      collaborators: collaborators.map((user, i) => ({
        ...getBBox(i),
        ...format(user),
        type: 'collaborator',
      })),
    }
  }
}
