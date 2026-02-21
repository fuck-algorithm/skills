#!/bin/bash

# Windsurf Skills Installer
# Usage: ./install.sh [target-project-path]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SOURCE="${SCRIPT_DIR}/skills"

# Default to current directory if no target specified
TARGET_PROJECT="${1:-.}"
TARGET_SKILLS_DIR="${TARGET_PROJECT}/.windsurf/skills"

echo "🚀 Installing Windsurf Skills..."
echo "   Source: ${SKILLS_SOURCE}"
echo "   Target: ${TARGET_SKILLS_DIR}"

# Check if source exists
if [ ! -d "${SKILLS_SOURCE}" ]; then
    echo "❌ Error: Skills source directory not found at ${SKILLS_SOURCE}"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "${TARGET_SKILLS_DIR}"

# Count skills
SKILL_COUNT=0

# Install each skill
for skill_dir in "${SKILLS_SOURCE}"/*/; do
    if [ -d "${skill_dir}" ]; then
        skill_name=$(basename "${skill_dir}")
        target_skill_dir="${TARGET_SKILLS_DIR}/${skill_name}"
        
        # Remove existing skill if present
        if [ -d "${target_skill_dir}" ]; then
            echo "📝 Updating: ${skill_name}"
            rm -rf "${target_skill_dir}"
        else
            echo "📦 Installing: ${skill_name}"
        fi
        
        # Copy skill files
        cp -r "${skill_dir}" "${target_skill_dir}"
        
        # Verify SKILL.md exists
        if [ ! -f "${target_skill_dir}/SKILL.md" ]; then
            echo "⚠️  Warning: ${skill_name} missing SKILL.md"
        fi
        
        ((SKILL_COUNT++)) || true
    fi
done

echo ""
echo "✅ Successfully installed ${SKILL_COUNT} skill(s)!"
echo ""
echo "Installed skills:"
ls -1 "${TARGET_SKILLS_DIR}"
echo ""
echo "💡 You can now use these skills in Windsurf by:"
echo "   1. Mentioning @skill-name in Cascade chat"
echo "   2. Or letting Cascade auto-detect based on your request"
