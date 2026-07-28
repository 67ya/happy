import type { SessionRowData } from '@/sync/storage';
import type { Machine } from '@/sync/storageTypes';

export interface ActiveSessionProjectGroup {
    displayPath: string;
    latestActivityAt: number;
    sessions: SessionRowData[];
}

export interface ActiveSessionMachineGroup {
    machineId: string;
    machineName: string;
    projects: Map<string, ActiveSessionProjectGroup>;
}

function getSessionActivityAt(session: SessionRowData): number {
    return session.updatedAt ?? session.createdAt ?? 0;
}

function formatProjectPath(path: string, homeDir?: string): string {
    if (!homeDir) return path;

    const normalizedHome = homeDir.endsWith('/') ? homeDir.slice(0, -1) : homeDir;
    if (!path.startsWith(normalizedHome)) return path;

    const relativePath = path.slice(normalizedHome.length);
    if (relativePath.startsWith('/')) return `~${relativePath}`;
    return relativePath === '' ? '~' : `~/${relativePath}`;
}

/**
 * Groups active sessions for the sidebar.
 *
 * Machines retain their stable name ordering. Project groups within a machine
 * are ordered by the most recently updated conversation in each group, so
 * activity in any child session moves the whole project group upward.
 */
export function buildActiveSessionGroups(
    sessions: readonly SessionRowData[],
    machines: readonly Machine[],
    unknownText: string,
): { machineGroups: ActiveSessionMachineGroup[]; hasMultipleMachines: boolean } {
    const machinesMap = new Map(machines.map((machine) => [machine.id, machine]));
    const byMachine = new Map<string, ActiveSessionMachineGroup>();

    sessions.forEach((session) => {
        const machineId = session.machineId || unknownText;
        const machine = machineId !== unknownText ? machinesMap.get(machineId) : null;
        const machineName = machine?.metadata?.displayName
            || machine?.metadata?.host
            || (machineId !== unknownText ? machineId : `<${unknownText}>`);

        let machineGroup = byMachine.get(machineId);
        if (!machineGroup) {
            machineGroup = { machineId, machineName, projects: new Map() };
            byMachine.set(machineId, machineGroup);
        }

        const projectPath = session.path || '';
        const activityAt = getSessionActivityAt(session);
        let projectGroup = machineGroup.projects.get(projectPath);
        if (!projectGroup) {
            projectGroup = {
                displayPath: formatProjectPath(projectPath, session.homeDir ?? undefined),
                latestActivityAt: activityAt,
                sessions: [],
            };
            machineGroup.projects.set(projectPath, projectGroup);
        } else {
            projectGroup.latestActivityAt = Math.max(projectGroup.latestActivityAt, activityAt);
        }
        projectGroup.sessions.push(session);
    });

    byMachine.forEach((machineGroup) => {
        machineGroup.projects.forEach((projectGroup) => {
            projectGroup.sessions.sort((a, b) =>
                getSessionActivityAt(b) - getSessionActivityAt(a)
            );
        });

        machineGroup.projects = new Map(
            Array.from(machineGroup.projects.entries()).sort(([, a], [, b]) =>
                b.latestActivityAt - a.latestActivityAt
                || a.displayPath.localeCompare(b.displayPath)
            )
        );
    });

    return {
        machineGroups: Array.from(byMachine.values()).sort((a, b) =>
            a.machineName.localeCompare(b.machineName)
        ),
        hasMultipleMachines: byMachine.size > 1,
    };
}
