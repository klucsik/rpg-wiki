facelift
shirnk docker image size
expand list viewfield if needed
remove the admin group from all the ui selectors, but add it anyway, admin shuld have godaccess
history view uses some other rendering... extract view rendering to make it DRY and working in the same way wherever its opened
if db gets nuked, suer sessions still kinda working, why?
After restore, local user (test) creation said already exists, not in user list tho.
Improve image handling, add an management ui to see slef uploaded iamges, how many reference it has, be able to delete unused ones
When selecting test in editor, update the formatting type selector based on what formatting is there aroudn the cursor or in the selection. If multiple selected, leave it blank.
Table formatting: we should be able to designate any row as header row, row size should be adjustable
Image caption
link formatting
in backup settings, if the backup after pagesave is not enabled, the manual trigger will fail with a message that it is not enabled. It shouldn't care about that setting.
Investigate:
    Keycloak user synced: af8ab8b4-1818-45f5-861a-82cd50d13d10 (klucsik)
    Keycloak user synced: 096a0c15-f5c2-4969-a981-18d80ab8bd3b (lninja007)
    [next-auth][error][OAUTH_CALLBACK_ERROR] 
    https://next-auth.js.org/errors#oauth_callback_error State cookie was missing. {
    error: Error [OAuthCallbackError]: State cookie was missing.
        at Object.use (.next/server/chunks/723.js:25:11094)
        at l (.next/server/chunks/723.js:25:21904)
        at async Object.c (.next/server/chunks/723.js:34:56452)
        at async _ (.next/server/chunks/723.js:25:52537)
        at async a (.next/server/chunks/723.js:17:22158)
        at async e.length.t (.next/server/chunks/723.js:17:23601) {
        code: undefined
    },
    providerId: 'keycloak',
    message: 'State cookie was missing.'
    }
    Keycloak user synced: 096a0c15-f5c2-4969-a981-18d80ab8bd3b (lninja007)
    [next-auth][error][OAUTH_CALLBACK_ERROR] 
    https://next-auth.js.org/errors#oauth_callback_error State cookie was missing. {
    error: Error [OAuthCallbackError]: State cookie was missing.
        at Object.use (.next/server/chunks/723.js:25:11094)
        at l (.next/server/chunks/723.js:25:21904)
        at async Object.c (.next/server/chunks/723.js:34:56452)
        at async _ (.next/server/chunks/723.js:25:52537)
        at async a (.next/server/chunks/723.js:17:22158)
        at async e.length.t (.next/server/chunks/723.js:17:23601) {
        code: undefined
    },
    providerId: 'keycloak',
    message: 'State cookie was missing.'
    }
    Keycloak user synced: 77ca87ba-5870-427b-8fc2-118308e08b8c (keno_vs)

Add telemetry and monitoring
on link creation: search  add a search bar for existing pages.
Search integration: full-text search, path and title search functions
make links visible, lists well functioning.