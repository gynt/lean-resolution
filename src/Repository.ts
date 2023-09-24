import { Dependency } from "./Dependency";
import { Package } from "./Package";

import { parse } from 'yaml'

type RepoYAMLDependencies = {
  [name: string]: string
}

type RepoYAML = {
  [id: string]: RepoYAMLDependencies
}

export function repositoryFromYaml(yaml: string) {
  const obj: RepoYAML = parse(yaml)

  const repo: Repository = Object.entries(obj).map(([id, deps]) => {
    const ds = Object.entries(deps).map(([name, versionRange]) => {
      return new Dependency(name, versionRange)
    })

    const [name, version] = id.split("@", 2)

    return new Package(name, version, ds)
  })

  return repo
}

export type Repository = Package[]