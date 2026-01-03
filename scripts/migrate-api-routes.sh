#!/bin/bash

# Script to migrate all API routes from NextAuth to Better Auth

echo "Migrating API routes from NextAuth to Better Auth..."

# Find all route.ts files in api directory
find src/app/api -name "route.ts" -type f | while read -r file; do
    # Skip the auth handler itself
    if [[ "$file" == *"/api/auth/"* ]]; then
        continue
    fi
    
    # Check if file contains getServerSession
    if grep -q "getServerSession" "$file"; then
        echo "Updating: $file"
        
        # Replace imports
        sed -i "s/import { getServerSession } from ['\"]next-auth['\"];/import { getServerAuth } from '@\/lib\/better-auth';/g" "$file"
        sed -i "s/import { getServerSession } from ['\"]next-auth\/next['\"];/import { getServerAuth } from '@\/lib\/better-auth';/g" "$file"
        
        # Remove authOptions import
        sed -i "/import.*authOptions.*from.*auth/d" "$file"
        
        # Replace getServerSession calls
        sed -i "s/getServerSession(authOptions)/getServerAuth()/g" "$file"
        sed -i "s/await getServerSession(authOptions)/await getServerAuth()/g" "$file"
    fi
done

echo "Migration complete!"
