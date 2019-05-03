#!/usr/bin/env node
// eslint-disable-next-line
import regeneratorRuntime from 'regenerator-runtime';
import path from 'path';
import { promisify } from 'util';

import { getConcurDeps } from './utils/updatePackageJson';


let pkg = require(path.resolve(process.cwd(), 'package.json'));
// Get dependencies as an array of tuples.
const dependencies = getConcurDeps(pkg.dependencies);
const devDependencies = getConcurDeps(pkg.devDependencies);
const peerDependencies = getConcurDeps(pkg.peerDependencies);
// assign all dependencies to an object to pass to our async function.
const allDeps = {
    dependencies,
    devDependencies,
    peerDependencies,
};


const exec = promisify(require('child_process').exec);
const writeFile = promisify(require('fs').writeFile);

// Get the latest version of the package from npm.
const getLatestVersion = async (dependency) => {
    const name = dependency[0];
    const version = dependency[1];
    const hasHat = new RegExp('^');
    // Don't update locked dependencies.
    if (!hasHat.test(version)) {
        return dependency;
    }
    try {
        const { stdout, stderr } = await exec(`npm view ${name} versions --json`);

        if (stderr) {
            // eslint-disable-next-line
            console.error(stderr);
            return { [name]: `^${version}`};
        }

        const versions = JSON.parse(stdout);
        // remove the hat for now.
        const cleanVersion = version.replace('^', '');
        const versionArray = cleanVersion.split('.');
        const majorVersion = versionArray[0];

        // Grab the most recent version that has the same major version number as our dependency.
        const mostRecentRelease = versions.filter(single => single.replace('^', '').split('.')[0] === majorVersion && !single.includes('-rc')).reverse()[0];
        // if the versions are the same, return original.
        if (cleanVersion === mostRecentRelease) {
            return dependency;
        }
        // return the release with the hat attached.
        return [name, `^${mostRecentRelease}`];
    } catch (e) {
        console.error(e);
        throw e;
    }

};

const getLatestVersions = async(dependenciesArray) => {
    try {
        return await Promise.all(dependenciesArray.map(dependency => getLatestVersion(dependency)));
    } catch (e) {
        console.error(e);
        throw e;
    }
    
};

const updatePackageJson = async (depsToUpdate) => {
    try {
        const updatedDependencies = await getLatestVersions(depsToUpdate.dependencies);
        const updatedDevDependencies = await getLatestVersions(depsToUpdate.devDependencies);
        const updatedPeerDependencies = await getLatestVersions(depsToUpdate.peerDependencies);
        // eslint-disable-next-line
        updatedDependencies.map((dependency) => {
            const [name, version] = dependency;
            if (pkg.dependencies[name]) {
                pkg.dependencies[name] = version;
            }
        });
        // eslint-disable-next-line
        updatedDevDependencies.map((devDependency) => {
            const [name, version] = devDependency;
            if (pkg.devDependencies[name]) {
                pkg.devDependencies[name] = version;
            }
        });
        // eslint-disable-next-line
        updatedPeerDependencies.map(peerDependency => {
            const [name, version] = peerDependency;
            if (pkg.peerDependencies[peerDependency[0]]) {
                pkg.peerDependencies[name] = version;
            }
        });
    } catch (e) {
        console.error(e);
        throw (e);
    }

    try {
        await writeFile(path.join(process.cwd(), 'package.json'), JSON.stringify(pkg, null, 4), 'utf8');
        console.log('dependencies updated for release');
    } catch (e) {
        console.error(e);
        throw e;
    }
};
// eslint-disable-next-line
(async () => await updatePackageJson(allDeps))();
