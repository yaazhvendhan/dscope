const path = require('path');

/**
 * Classifies a filesystem node into a high-level category.
 * 
 * Rules are applied effectively deterministically.
 * Uses a rigid set of well-known paths and patterns.
 * 
 * @param {object} node - The scan node to classify (must have 'path' and 'type').
 * @returns {object} - { category: string, confidence: 'high'|'medium'|'low' }
 */
function classifyNode(node) {
    // Defensive check
    if (!node || !node.path) {
        return { category: 'unclassified', confidence: 'low' };
    }

    // Normalize path for consistent checking
    const fullPath = node.path;
    const isDirectory = node.type === 'directory';
    const basename = path.basename(fullPath);

    // --- Rule 1: Containers ---
    // Docker: /var/lib/docker
    // Podman/Containers: /var/lib/containers
    if (fullPath.startsWith('/var/lib/docker') || fullPath.startsWith('/var/lib/containers')) {
        return { category: 'containers', confidence: 'high' };
    }

    // --- Rule 2: Packages ---
    // Snap: /var/lib/snapd
    // Flatpak: ~/.var/app (usually /home/user/.var/app)
    if (fullPath.startsWith('/var/lib/snapd')) {
        return { category: 'packages', confidence: 'high' };
    }
    if (fullPath.includes('/.var/app')) {
        return { category: 'packages', confidence: 'medium' }; // Medium because it could be coincidental, but likely flatpak
    }

    // --- Rule 3: Logs ---
    // Start with /var/log
    if (fullPath.startsWith('/var/log')) {
        return { category: 'logs', confidence: 'high' };
    }

    // --- Rule 4: Cache ---
    // /var/cache
    if (fullPath.startsWith('/var/cache')) {
        return { category: 'cache', confidence: 'high' };
    }
    // User cache: ~/.cache
    // We check for /.cache/ in the path. 
    // Note: strict check might be improved, but this is a good heuristic for now.
    if (fullPath.includes('/.cache')) {
        return { category: 'cache', confidence: 'high' };
    }

    // --- Rule 5: System ---
    // /usr, /lib, /lib64, /bin, /sbin
    // We check strict prefixes.
    const systemPaths = ['/usr', '/lib', '/lib64', '/bin', '/sbin'];
    if (systemPaths.some(p => fullPath === p || fullPath.startsWith(p + '/'))) {
        return { category: 'system', confidence: 'high' };
    }

    // --- Rule 6: Boot / Kernels ---
    // Must be in /boot AND match pattern if file
    if (fullPath.startsWith('/boot')) {
        if (!isDirectory && (basename.startsWith('vmlinuz') || basename.startsWith('initrd'))) {
            return { category: 'kernels', confidence: 'high' };
        }
        // General /boot stuff is system/boot, we can call it system or kernels. 
        // Spec asked for "files under /boot matching... -> kernels".
        // It didn't strictly classify /boot folder itself, but let's default /boot contents to system if not kernel?
        // Or maybe just leave it unclassified or system.
        // Let's stick to the specific rule for 'kernels'.
    }

    // --- Rule 7: User Data ---
    // /home, excluding known hidden/cache logic above
    // Note: This rule comes AFTER cache/packages rules to ensure ~/.cache is 'cache', not 'user-data'
    if (fullPath.startsWith('/home')) {
        return { category: 'user-data', confidence: 'high' };
    }

    // --- Default: Unclassified ---
    return { category: 'unclassified', confidence: 'low' };
}

module.exports = { classifyNode };
