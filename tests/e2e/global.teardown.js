import child_process from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

export default async function () {
    console.log('Fin des tests. On tue les conteneurs Dockers.')
    await exec(`docker compose -f compose-tests.yml down`)
}


