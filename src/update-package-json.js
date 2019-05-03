#!/usr/bin/env node
import { getConcurDeps } from './utils/updatePackageJson';
import path from 'path';
import { promisify } from 'util';
// eslint-disable-next-line
import regeneratorRuntime from "regenerator-runtime";

let pkg = require(path.resolve(process.cwd(), 'package.json'));
// Get dependencies as an array of tuples.
const dependencies = getConcurDeps(pkg.dependencies);
const devDependencies = getConcurDeps(pkg.devDependencies);
const peerDependencies = getConcurDeps(pkg.peerDependencies);
// assign all dependencies to an object to pass to our async function.
const allDeps = {
    dependencies,
    devDependencies,
    peerDependencies
};


const exec = promisify(require('child_process').exec);
const writeFile = promisify(require('fs').writeFile);

// Get the latest version of the package from npm.
const getLatestVersion = async(dependency) => {
    const name = dependency[0];
    const version = dependency[1];
    const hasHat = new RegExp('\^');
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
        const mostRecentRelease = versions.filter(single => {
            return single.replace('^', '').split('.')[0] === majorVersion && ! single.includes('-rc');
        }).reverse()[0];
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
    } catch(e) {
        console.error(e);
        throw e;
    }
    
};

const updatePackageJson = async(depsToUpdate) => {
    try {
        const updatedDependencies = await getLatestVersions(depsToUpdate.dependencies);
        const updatedDevDependencies = await getLatestVersions(depsToUpdate.devDependencies);
        const updatedPeerDependencies = await getLatestVersions(depsToUpdate.peerDependencies);
    
        updatedDependencies.map(dependency => {
            if (pkg.devDependencies[dependency[0]]) {
                pkg.devDependencies[dependency[0]] = dependency[1];
            }
        });
        updatedDevDependencies.map(devDependency => {
            if (pkg.devDependencies[devDependency[0]]) {
                pkg.devDependencies[devDependency[0]] = devDependency[1];
            }
        });
        updatedPeerDependencies.map(peerDependency => {
            if (pkg.peerDependencies[peerDependency[0]]) {
                pkg.peerDependencies[peerDependency[0]] = peerDependency[1];
            }
        });
    } catch (e) {
        console.error(e);
        throw(e);
    }

    try {
        await writeFile(path.join(process.cwd(), 'package.json'), JSON.stringify(pkg, null, 4), 'utf8');
        console.log('dependencies updated for release');
    } catch (e) {
        console.error(e);
        throw e;
    }
};

(async() => await updatePackageJson(allDeps))();
