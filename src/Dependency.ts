import { Range, SemVer, intersects, maxSatisfying, satisfies } from 'semver'
import { Package } from './Package';

export class Dependency {
  name: string;
  versionRange: Range;
  targetPackage?: Package;

  constructor(name: string, versionRange: string) {
    this.name = name;
    this.versionRange = new Range(versionRange, { loose: true });
    this.targetPackage = undefined;

    if (this.versionRange === null) {
      throw Error(`Illegal version range: ${name} ${versionRange}`)
    }
  }

  isSatisfiedBy(p: Package) {
    return p.name == this.name && satisfies(p.version, this.versionRange.range)
  }

  maxSatisfyingPackage(packages: Package[]) {
    const ps = packages.filter((p) => p.name === this.name)
    const ms = maxSatisfying(ps.map((p) => p.version), this.versionRange.range)

    return ps.filter((p) => p.version === ms).at(0)
  }

  intersectsDependency(d: Dependency) {
    return intersects(this.versionRange.range, d.versionRange.range)
  }

  toString() {
    const tp = `${this.targetPackage !== undefined ? `${this.targetPackage.name}-${this.targetPackage.version}` : ''}`
    return `${this.name}: ${this.versionRange.range} (${tp})`
  }
}
