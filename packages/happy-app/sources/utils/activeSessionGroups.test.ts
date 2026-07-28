import { describe, expect, it } from 'vitest';
import type { SessionRowData } from '@/sync/storage';
import type { Machine } from '@/sync/storageTypes';
import { buildActiveSessionGroups } from './activeSessionGroups';

function session(
    id: string,
    path: string,
    updatedAt: number,
    machineId = 'machine-1',
): SessionRowData {
    return {
        id,
        name: id,
        subtitle: '',
        avatarId: id,
        flavor: null,
        state: 'waiting',
        updatedAt,
        hasDraft: false,
        active: true,
        machineId,
        path,
        homeDir: '/home/user',
        completedTodosCount: 0,
        totalTodosCount: 0,
        hasUnread: false,
    };
}

const machines: Machine[] = [{
    id: 'machine-1',
    seq: 1,
    createdAt: 1,
    updatedAt: 1,
    active: true,
    activeAt: 1,
    metadata: {
        host: 'workstation',
        platform: 'linux',
        happyCliVersion: 'test',
        happyHomeDir: '/home/user/.happy',
        homeDir: '/home/user',
        displayName: 'Workstation',
    },
    metadataVersion: 1,
    daemonState: null,
    daemonStateVersion: 1,
}];

describe('active session project group ordering', () => {
    it('moves a project group up when any session in it is more recent', () => {
        const { machineGroups } = buildActiveSessionGroups([
            session('project-a-old', '/home/user/project-a', 10),
            session('project-b', '/home/user/project-b', 20),
            session('project-a-new', '/home/user/project-a', 30),
        ], machines, 'Unknown');

        const projects = Array.from(machineGroups[0].projects.values());

        expect(projects.map((project) => project.displayPath)).toEqual([
            '~/project-a',
            '~/project-b',
        ]);
        expect(projects[0].sessions.map((item) => item.id)).toEqual([
            'project-a-new',
            'project-a-old',
        ]);
    });

    it('uses the display path as a stable tie-breaker', () => {
        const { machineGroups } = buildActiveSessionGroups([
            session('project-z', '/home/user/project-z', 10),
            session('project-a', '/home/user/project-a', 10),
        ], machines, 'Unknown');

        expect(Array.from(machineGroups[0].projects.values())
            .map((project) => project.displayPath))
            .toEqual(['~/project-a', '~/project-z']);
    });
});
