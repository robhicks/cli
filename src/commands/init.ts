import { GluegunToolbox } from 'gluegun'
import ignore from 'ignore'

export default {
  name: 'init',
  run: async ({
    filesystem: { append, read, exists, remove },
    template: { generate },
    print: {
      colors: { highlight },
      error,
      fancy,
      spin,
    },
    prompt: { ask },
    system: { run, which },
  }: GluegunToolbox) => {
    if (exists('.supabase')) {
      error(`Project already initialized. Remove ${highlight('.supabase')} to reinitialize.`)
      process.exit(1)
    }

    // Cleanup on Ctrl+C
    process.on('SIGINT', () => {
      remove('.supabase')
      error(`Aborted ${highlight('supabase init')}.`)
      process.exit(1)
    })

    const dockerCompose = which('docker-compose')
    const podmanCompose = which('podman-compose')
    if (!dockerCompose && !podmanCompose) {
      error(
        `Cannot find ${highlight('docker-compose')} or ${highlight(
          'podman-compose'
        )} executable in PATH.`
      )
      process.exit(1)
    }

    // Add .supabase to .gitignore
    const gitignore = read('.gitignore')
    if (gitignore) {
      const ig = ignore().add(gitignore)
      if (!ig.ignores('.supabase')) {
        append('.gitignore', '\n# Supabase\n.supabase\n')
      }
    }

    const { kongPort, dbPort, mailPort } = await ask([
      {
        type: 'input',
        name: 'kongPort',
        message: 'Port for Supabase URL:',
        initial: '8000',
      },
      {
        type: 'input',
        name: 'dbPort',
        message: 'Port for PostgreSQL database:',
        initial: '5432',
      },
      {
        type: 'input',
        name: 'mailPort',
        message: 'Port for email testing interface:',
        initial: '9000',
      },
    ])

    const anonApiKey =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTYwMzk2ODgzNCwiZXhwIjoyNTUwNjUzNjM0LCJyb2xlIjoiYW5vbiJ9.36fUebxgx1mcBo4s19v0SzqmzunP--hm_hep0uLX0ew'
    const serviceRoleApiKey =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTYwMzk2ODgzNCwiZXhwIjoyNTUwNjUzNjM0LCJyb2xlIjoic2VydmljZV9yb2xlIn0.necIJaiP7X2T2QjGeV-FhpkizcNTX8HjDDBAxpgQTEI'

    const spinner = spin('Initializing project...')

    // Write templates
    await Promise.all(
      [
        'docker/kong/Dockerfile',
        'docker/kong/kong.yml',
        'docker/postgres/00-initial-schema.sql',
        'docker/postgres/Dockerfile',
        'docker/postgres/auth-schema.sql',
        'docker/postgres/storage-schema.sql',
        'docker/docker-compose.yml',
        'README.md',
      ].map((f) =>
        generate({
          template: `init/${f}`,
          target: `.supabase/${f}`,
          props: {
            kongPort,
            dbPort,
            mailPort,
            anonApiKey,
            serviceRoleApiKey,
          },
        })
      )
    ).catch((err) => {
      remove('.supabase')
      spinner.fail(`Error writing Docker setup files: ${err.message}`)
      process.exit(1)
    })

    if (dockerCompose) {
      await run(
        'docker-compose --file .supabase/docker/docker-compose.yml build --no-cache && docker-compose --file .supabase/docker/docker-compose.yml --project-name supabase up --build --no-start --renew-anon-volumes',
        { trim: true }
      ).catch((err) => {
        remove('.supabase')
        spinner.fail(`Error running docker-compose: ${err.stderr}`)
        process.exit(1)
      })
    } else {
      await run(
        'podman-compose --file .supabase/docker/docker-compose.yml build && podman-compose --file .supabase/docker/docker-compose.yml --project-name supabase up --build --no-start --renew-anon-volumes',
        { trim: true }
      ).catch((err) => {
        remove('.supabase')
        spinner.fail(`Error running podman-compose: ${err.stderr}`)
        process.exit(1)
      })
    }

    spinner.succeed('Project initialized.')
    fancy(`Supabase URL: ${highlight(`http://localhost:${kongPort}`)}
Supabase Key (anon, public): ${highlight(anonApiKey)}
Supabase Key (service_role, private): ${highlight(serviceRoleApiKey)}
Database URL: ${highlight(`postgres://postgres:postgres@localhost:${dbPort}/postgres`)}
Email testing interface URL: ${highlight(`http://localhost:${mailPort}`)}

Run ${highlight('supabase start')} to start local Supabase.
`)
  },
}
