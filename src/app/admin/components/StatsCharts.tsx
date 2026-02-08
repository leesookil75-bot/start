'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { StatEntry, AreaStatEntry } from '@/lib/statistics';
import styles from './stats.module.css';

const COLORS_45 = '#3b82f6'; // blue-500
const COLORS_75 = '#eab308'; // yellow-500

interface StatsChartsProps {
    data: StatEntry[];
    type: 'bar' | 'pie';
}

export default function StatsCharts({ data, type }: StatsChartsProps) {
    if (type === 'bar') {
        return (
            <div
                className={styles.chartContainer}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
            >
                <div style={{ minWidth: Math.max(100, data.length * 50) + 'px', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="key" stroke="#888" fontSize={12} tickMargin={10} />
                            <YAxis stroke="#888" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar dataKey="count45" name="45L Bag" fill={COLORS_45} stackId="a" />
                            <Bar dataKey="count75" name="75L Bag" fill={COLORS_75} stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];

    if (type === 'pie') {
        return (
            <div
                className={styles.chartContainer}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ key, percent }: any) => `${key} (${((percent || 0) * 100).toFixed(0)}%)`}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="total"
                            nameKey="key"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any, name: any, props: any) => {
                                const { payload } = props;
                                return [`${value} (45L: ${payload.count45}, 75L: ${payload.count75})`, name];
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    // Default fallback (though types restrict to bar/pie)
    return null;
}
