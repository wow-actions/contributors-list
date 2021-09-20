import * as core from '@actions/core'
import * as github from '@actions/github'
import sharp from 'sharp'
import fetch from 'node-fetch'
import { imageSize } from 'image-size'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function getInputs() {
    const count = parseInt(core.getInput('count'), 10)
    const truncate = parseInt(core.getInput('truncate'), 10)
    const svgWidth = parseInt(core.getInput('svgWidth'), 10)
    const avatarSize = parseInt(core.getInput('avatarSize'), 10)
    const avatarMargin = parseInt(core.getInput('avatarMargin'), 10)
    const userNameHeight = parseInt(core.getInput('userNameHeight'), 10)
    return {
      repo: core.getInput('repo') || '',
      sort: core.getInput('sort') === 'true',
      count: Number.isNaN(count) ? null : count,
      round: core.getInput('round') !== 'false',
      includeBots: core.getInput('includeBots') === 'true',
      affiliation: core.getInput('affiliation') as 'all' | 'direct' | 'outside',
      svgPath: core.getInput('svgPath') || './contributors.svg',
      svgTemplate: core.getInput('svgTemplate'),
      itemTemplate: core.getInput('itemTemplate'),
      noCommit: core.getInput('noCommit') === 'true',
      commitMessage: core.getInput('commitMessage'),
      truncate: Number.isNaN(truncate) ? 0 : truncate,
      svgWidth: Number.isNaN(svgWidth) ? 740 : svgWidth,
      avatarSize: Number.isNaN(avatarSize) ? 64 : avatarSize,
      avatarMargin: Number.isNaN(avatarMargin) ? 5 : avatarMargin,
      userNameHeight: Number.isNaN(userNameHeight) ? 0 : userNameHeight,
    }
  }

  export async function getLargeFile(
    octokit: ReturnType<typeof getOctokit>,
    path: string,
  ) {
    const { context } = github
    const { data } = await octokit.rest.git.getTree({
      ...context.repo,
      tree_sha: context.sha,
      recursive: 'true',
    })

    const found = data.tree.find((item) => item.path === path)
    if (found) {
      return octokit.request('GET /repos/:owner/:repo/git/blobs/:file_sha', {
        ...context.repo,
        file_sha: found.sha,
      })
    }

    return null
  }

  export function calcSectionHeight(
    total: number,
    options: ReturnType<typeof getInputs>,
  ) {
    const { svgWidth } = options
    const { avatarMargin } = options
    const avatarWidth = options.avatarSize
    const avatarHeight = options.avatarSize
    const itemWidth = avatarWidth + 2 * avatarMargin
    const itemHeight = avatarHeight + 2 * avatarMargin + options.userNameHeight
    const colCount = Math.floor(svgWidth / itemWidth)

    return itemHeight * Math.ceil(total / colCount)
  }

  async function fetchAvatar(
    url: string,
    options: ReturnType<typeof getInputs>,
  ) {
    return fetch(url).then(async (res) => {
      const type = res.headers.get('content-type')
      const prefix = `data:${type};base64,`

      // eslint-disable-next-line promise/no-nesting
      return res.buffer().then((buffer) => {
        if (options.round) {
          const box = imageSize(buffer)
          const size = Math.min(
            box.width || options.avatarSize,
            box.height || options.avatarSize,
          )
          const r = size / 2
          const overlay = Buffer.from(
            `<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`,
          )

          // eslint-disable-next-line promise/no-nesting
          return sharp(buffer)
            .composite([
              {
                input: overlay,
                blend: 'dest-in',
              },
            ])
            .png()
            .toBuffer()
            .then((b) => `data:image/png;base64,${b.toString('base64')}`)
        }

        return prefix + buffer.toString('base64')
      })
    })
  }

  function getItemBBox(index: number, options: ReturnType<typeof getInputs>) {
    const { svgWidth } = options
    const { avatarMargin } = options
    const avatarWidth = options.avatarSize
    const avatarHeight = options.avatarSize
    const colCount = Math.floor(svgWidth / (avatarWidth + 2 * avatarMargin))
    const colIndex = index % colCount
    const rowIndex = Math.floor(index / colCount)

    return {
      x: avatarMargin + colIndex * (avatarWidth + avatarMargin),
      y:
        avatarMargin +
        rowIndex * (avatarHeight + avatarMargin + options.userNameHeight),
      width: avatarWidth,
      height: avatarHeight,
    }
  }

  function getUserName(login: string, options: ReturnType<typeof getInputs>) {
    return options.truncate > 0 && login.length > options.truncate
      ? `${login.substr(0, options.truncate)}...`
      : login
  }

  async function getAllContributors(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
  ) {
    const req = (page?: number) =>
      octokit.rest.repos.listContributors({
        owner,
        repo,
        page,
        per_page: 100,
      })

    const res = await req()
    const users = res.data || []
    const { link } = res.headers
    const matches = link ? link.match(/[&|?]page=\d+/gim) : null
    if (matches) {
      const nums = matches.map((item) => parseInt(item.split('=')[1], 10))
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      for (let i = min; i <= max; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const { data } = await req(i)
        if (data) {
          users.push(...data)
        }
      }
    }

    return users
  }

  async function getAllCollaborators(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    affiliation: 'all' | 'direct' | 'outside',
  ) {
    const req = (page?: number) =>
      octokit.rest.repos.listCollaborators({
        owner,
        repo,
        page,
        affiliation,
        per_page: 100,
      })
    const res = await req()
    const users = res.data || []
    const { link } = res.headers
    const matches = link ? link.match(/[&|?]page=\d+/gim) : null
    if (matches) {
      const nums = matches.map((item) => parseInt(item.split('=')[1], 10))
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      for (let i = min; i <= max; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const { data } = await req(i)
        if (data) {
          users.push(...data)
        }
      }
    }

    return users
  }

  export async function getUsers(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    options: ReturnType<typeof getInputs>,
  ) {
    const allContributors = await getAllContributors(octokit, owner, repo)
    const collaborators = await getAllCollaborators(
      octokit,
      owner,
      repo,
      options.affiliation,
    )

    const excludeUsers = (core.getInput('excludeUsers') || '')
      .split(/\s+/)
      .map((user) => user.trim())
      .filter((user) => user.length > 0)

    const contributors = options.includeBots
      ? allContributors
      : allContributors.filter((el) => el.type !== 'Bot')
    const bots = allContributors.filter((el) => el.type === 'Bot')

    if (options.sort) {
      contributors.sort((a, b) => b.contributions - a.contributions)
      bots.sort((a, b) => b.contributions - a.contributions)
    }

    const deferred1 = contributors
      .filter((user) => !excludeUsers.includes(user.login!))
      .map(async (user, i) => ({
        ...getItemBBox(i, options),
        name: getUserName(user.login!, options),
        avatar: await fetchAvatar(user.avatar_url!, options),
        url: user.html_url,
        type: user.type === 'Bot' ? 'bot' : 'contributor',
      }))

    const deferred2 = bots
      .filter((user) => !excludeUsers.includes(user.login!))
      .map(async (user, i) => ({
        ...getItemBBox(i, options),
        name: getUserName(user.login!, options),
        avatar: await fetchAvatar(user.avatar_url!, options),
        url: user.html_url,
        type: 'bot',
      }))

    const deferred3 = collaborators
      .filter((user) => !excludeUsers.includes(user.login))
      .map(async (user, i) => ({
        ...getItemBBox(i, options),
        name: getUserName(user.login, options),
        avatar: await fetchAvatar(user.avatar_url, options),
        url: user.html_url,
        type: 'collaborator',
      }))

    return Promise.all([
      Promise.all(deferred1),
      Promise.all(deferred2),
      Promise.all(deferred3),
    ]).then(([contributorArr, botArr, collaboratorArr]) =>
      options.count
        ? {
            bots: botArr.slice(0, options.count),
            contributors: contributorArr.slice(0, options.count),
            collaborators: collaboratorArr.slice(0, options.count),
          }
        : {
            bots: botArr,
            contributors: contributorArr,
            collaborators: collaboratorArr,
          },
    )
  }
}
