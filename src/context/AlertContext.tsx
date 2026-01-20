import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertButton } from 'react-native';

interface AlertState {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    options?: {
        cancelable?: boolean;
        onDismiss?: () => void;
    };
}

interface AlertContextType {
    showAlert: (
        title: string,
        message?: string,
        buttons?: AlertButton[],
        options?: { cancelable?: boolean; onDismiss?: () => void }
    ) => void;
    hideAlert: () => void;
    alertState: AlertState;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

interface AlertProviderProps {
    children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        buttons: [],
        options: { cancelable: true }
    });

    const showAlert = (
        title: string,
        message?: string,
        buttons?: AlertButton[],
        options?: { cancelable?: boolean; onDismiss?: () => void }
    ) => {
        setAlertState({
            visible: true,
            title,
            message,
            buttons: buttons || [{ text: 'OK', onPress: () => hideAlert() }],
            options: options || { cancelable: true }
        });
    };

    const hideAlert = () => {
        setAlertState(prev => ({ ...prev, visible: false }));
    };

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert, alertState }}>
            {children}
        </AlertContext.Provider>
    );
};
