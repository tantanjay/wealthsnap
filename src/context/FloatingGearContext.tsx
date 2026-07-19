import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getFloatingGearDocked, saveFloatingGearDocked } from '@services/core/storageService';

export interface SecondGearAction {
    label: string;
    icon: string;
    onPress: () => void;
}

interface FloatingGearContextType {
    isDocked: boolean;
    pendingPosition: { x: number; y: number } | null;
    secondAction: SecondGearAction | null;
    registerSecondAction: (routeName: string, action: SecondGearAction | null) => void;
    setActiveRoute: (routeName: string) => void;
    requestUndock: (x: number, y: number) => void;
    requestDock: () => void;
}

const FloatingGearContext = createContext<FloatingGearContextType | undefined>(undefined);

export const useFloatingGear = () => {
    const ctx = useContext(FloatingGearContext);
    if (!ctx) {
        throw new Error('useFloatingGear must be used within a FloatingGearProvider');
    }
    return ctx;
};

export const FloatingGearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDocked, setIsDocked] = useState(true);
    const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
    // Actions are kept per-route (rather than a single slot cleared on blur) so that
    // switching tabs quickly doesn't leave a stale/missing menu while the destination
    // screen's own effects are still catching up - only which route is "active" needs
    // to update instantly, which comes from navigation state, not a screen's effects.
    const [actionsByRoute, setActionsByRoute] = useState<Record<string, SecondGearAction>>({});
    const [activeRouteName, setActiveRouteName] = useState<string | null>(null);

    // Restore the docked/undocked state from the last session. If it was left
    // floating, there's no remembered drop point (pendingPosition stays null)
    // so FloatingGearBubble falls back to a sensible default spot.
    useEffect(() => {
        (async () => {
            const persistedDocked = await getFloatingGearDocked();
            if (persistedDocked === false) {
                setIsDocked(false);
            }
        })();
    }, []);

    const registerSecondAction = useCallback((routeName: string, action: SecondGearAction | null) => {
        setActionsByRoute(prev => {
            if (action === null) {
                if (!(routeName in prev)) return prev;
                const next = { ...prev };
                delete next[routeName];
                return next;
            }
            const existing = prev[routeName];
            if (existing && existing.label === action.label && existing.icon === action.icon) return prev;
            return { ...prev, [routeName]: action };
        });
    }, []);

    const setActiveRoute = useCallback((routeName: string) => {
        setActiveRouteName(routeName);
    }, []);

    const requestUndock = useCallback((x: number, y: number) => {
        setPendingPosition({ x, y });
        setIsDocked(false);
        saveFloatingGearDocked(false);
    }, []);

    const requestDock = useCallback(() => {
        setIsDocked(true);
        setPendingPosition(null);
        saveFloatingGearDocked(true);
    }, []);

    const secondAction = useMemo(
        () => (activeRouteName ? actionsByRoute[activeRouteName] ?? null : null),
        [activeRouteName, actionsByRoute]
    );

    return (
        <FloatingGearContext.Provider
            value={{ isDocked, pendingPosition, secondAction, registerSecondAction, setActiveRoute, requestUndock, requestDock }}
        >
            {children}
        </FloatingGearContext.Provider>
    );
};
