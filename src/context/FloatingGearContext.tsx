import React, { createContext, useCallback, useContext, useState } from 'react';

export interface SecondGearAction {
    label: string;
    icon: string;
    onPress: () => void;
}

interface FloatingGearContextType {
    isDocked: boolean;
    pendingPosition: { x: number; y: number } | null;
    secondAction: SecondGearAction | null;
    registerSecondAction: (action: SecondGearAction | null) => void;
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
    const [secondAction, setSecondAction] = useState<SecondGearAction | null>(null);

    const registerSecondAction = useCallback((action: SecondGearAction | null) => {
        setSecondAction(action);
    }, []);

    const requestUndock = useCallback((x: number, y: number) => {
        setPendingPosition({ x, y });
        setIsDocked(false);
    }, []);

    const requestDock = useCallback(() => {
        setIsDocked(true);
        setPendingPosition(null);
    }, []);

    return (
        <FloatingGearContext.Provider
            value={{ isDocked, pendingPosition, secondAction, registerSecondAction, requestUndock, requestDock }}
        >
            {children}
        </FloatingGearContext.Provider>
    );
};
