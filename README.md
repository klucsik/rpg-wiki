# RPG Wiki

A wiki like information system for RPGs, with focus on granual access control.
The main motivation behind this project is to provide a wiki that allows for restricted access to pages and specific content within pages, making it suitable for RPG campaigns where some information should only be visible to the game master or specific players.
The RPG wiki is built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.
## Disclaimer
This is a personal project, and is not intended for production use. It is a work in progress, and may contain bugs or incomplete features. Use at your own risk.
This is project heavily uses AI code generation.
This is not a security product, do not store any sensitive information in it, and do not use it for any sensitive applications.
This software is provided as is, without warranty of any kind.

## Features

### Restricted Access to pages and specific content in pages
- Pages can be restricted to specific user groups.
- Specific content within pages can be restricted to specific user groups. So you can have your DM notes between the lines of the publicly available content.
- If a user has edit rights to the page, they still won't see restricted content, only a placeholder.
- The restricted content not leaves the server.

![Restricted Block Editor](doc/restricted%20block%20editor.png)

![Restricted Block View](doc/restricted%20block%20viewer.png)

### User Groups
- Users can be assigned to groups.
- Groups can be assigned to pages and Restricted Blocks within pages.

### History and autosave
- Every change to a page is saved in the history.
- When you edit a page, the last version is automatically saved as a draft. This draft needs to be saved explicitly to become the new version, and be visible.

### Backup to GitHub
- You can set up a git repository on GitHub to which the wiki will be backed up.
- After each successful save, the wiki will be pushed to the repository.
- The pages are saved as plain html content, so everything is readable in them, make sure you restrict access to the backing repository.
- user information is not saved to the repository, so groups and users needs to be restored manually.

### Keycloak Integration
- The wiki can be integrated with Keycloak through ENV variables, on a sign on, local users are automatically generated.

## Installation

The wiki images is hosted on DockerHub with the image name `klucsikkp/rpg-wiki`.
You can explore the docker-compose.yml and k8s-deployment-example.yaml files for deployment examples.