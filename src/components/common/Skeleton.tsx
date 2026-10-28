import React, { useEffect, useState } from 'react';
import { Animated, ViewStyle, DimensionValue } from 'react-native';

import { useTheme } from '@context/ThemeContext';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    style?: ViewStyle;
    borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    style,
    borderRadius = 4
}) => {
    const { ds } = useTheme();
    const [opacity] = useState(() => new Animated.Value(0.3));

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    const baseColor = ds.hairline;

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: baseColor,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};
