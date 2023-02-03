import * as github from '@actions/github';
export declare function getOctokit(): import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
};
export declare function getInputs(): {
    repo: string;
    sort: boolean;
    count: number | null;
    round: boolean;
    includeBots: boolean;
    affiliation: "all" | "direct" | "outside";
    svgPath: string;
    svgTemplate: string;
    itemTemplate: string;
    noCommit: boolean;
    commitMessage: string;
    truncate: number;
    svgWidth: number;
    avatarSize: number;
    avatarMargin: number;
    userNameHeight: number;
};
export declare function getLargeFile(octokit: ReturnType<typeof getOctokit>, path: string): Promise<import("@octokit/types").OctokitResponse<any, number> | null>;
export declare function calcSectionHeight(total: number, options: ReturnType<typeof getInputs>): number;
export declare function getUsers(octokit: ReturnType<typeof github.getOctokit>, owner: string, repo: string, options: ReturnType<typeof getInputs>): Promise<{
    bots: {
        name: string;
        avatar: string;
        url: string | undefined;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
    contributors: {
        name: string;
        avatar: string;
        url: string | undefined;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
    collaborators: {
        name: string;
        avatar: string;
        url: string;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
}>;
