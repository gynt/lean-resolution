// https://khalilstemmler.com/blogs/typescript/node-starter-project/

import { repositoryFromYaml } from './Repository'
import { Tree } from './core/Tree'

export * from './Dependency'
export * from './Package'
export * from './Repository'
export * from './core/Tree'
export * from './core/Node'
export * from './core/Edge'
export * from './core/algorithms/Bruteforce'
export * from './core/algorithms/SimpleConflictSolver'

export type YamlString = string

export function solve(repository: YamlString, packageIds: string[]) {
  const tree = new Tree(repositoryFromYaml(repository))

  const solution = tree.solve(packageIds.map((pid) => tree.nodeForID(pid).spec))

  return solution
}