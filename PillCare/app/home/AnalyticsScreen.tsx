import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    Dimensions,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
        borderRadius: 16,
    },
};

export default function AnalyticsScreen() {
    const [dosesPerDay, setDosesPerDay] = useState<{ [key: string]: number }>({});
    const [doseLogs, setDoseLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [role, setRole] = useState<'senior' | 'family' | null>(null);
    const [seniorId, setSeniorId] = useState<string | null>(null);

    const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').toDate());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const [summary, setSummary] = useState({
        total: 0,
        taken: 0,
        missed: 0,
        adherenceRate: 0,
    });

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (seniorId) fetchDoseLogs();
    }, [seniorId, startDate, endDate]);

    const fetchUser = async () => {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error || !user) return;

        setUserId(user.id);

        const { data, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !data) return;

        setRole(data.role);

        if (data.role === 'senior') {
            setSeniorId(user.id);
        } else {
            const { data: link, error: linkError } = await supabase
                .from('links')
                .select('senior_id')
                .eq('family_id', user.id)
                .single();

            if (linkError || !link?.senior_id) return;

            setSeniorId(link.senior_id);
        }
    };

    const fetchDoseLogs = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('dose_logs')
            .select('scheduled_time, status')
            .eq('senior_id', seniorId)
            .gte('scheduled_time', startDate.toISOString())
            .lte('scheduled_time', dayjs(endDate).endOf('day').toISOString());

        if (error) {
            console.error(error.message);
            setLoading(false);
            return;
        }

        const counts: { [key: string]: number } = {};
        let taken = 0;
        let missed = 0;

        (data || []).forEach((log) => {
            const day = dayjs(log.scheduled_time).format('YYYY-MM-DD');
            counts[day] = (counts[day] || 0) + 1;
            if (log.status === 'taken') taken++;
            if (log.status === 'missed') missed++;
        });

        const total = data?.length || 0;
        const adherenceRate = total ? Math.round((taken / total) * 100) : 0;

        setDoseLogs(data || []);
        setDosesPerDay(counts);
        setSummary({ total, taken, missed, adherenceRate });
        setLoading(false);
    };

    const quickSetDateRange = (range: 'today' | 'week' | 'month') => {
        const now = new Date();
        switch (range) {
            case 'today':
                setStartDate(dayjs(now).startOf('day').toDate());
                setEndDate(now);
                break;
            case 'week':
                setStartDate(dayjs(now).subtract(7, 'day').startOf('day').toDate());
                setEndDate(now);
                break;
            case 'month':
                setStartDate(dayjs(now).subtract(30, 'day').startOf('day').toDate());
                setEndDate(now);
                break;
        }
    };

    const dataLabels = Object.keys(dosesPerDay).sort();
    const doseData = dataLabels.map((label) => dosesPerDay[label]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Medication Analytics</Text>

            <View style={styles.quickRange}>
                <Button title="Today" onPress={() => quickSetDateRange('today')} />
                <Button title="Past Week" onPress={() => quickSetDateRange('week')} />
                <Button title="Past Month" onPress={() => quickSetDateRange('month')} />
            </View>

            <View style={styles.datePickers}>
                <View style={styles.dateButton}>
                    <Button
                        title={`Start: ${dayjs(startDate).format('DD MMM')}`}
                        onPress={() => setShowStartPicker(true)}
                    />
                </View>
                <View style={styles.dateButton}>
                    <Button
                        title={`End: ${dayjs(endDate).format('DD MMM')}`}
                        onPress={() => setShowEndPicker(true)}
                    />
                </View>
            </View>

            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(_, date) => {
                        setShowStartPicker(false);
                        if (date) setStartDate(date);
                    }}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(_, date) => {
                        setShowEndPicker(false);
                        if (date) setEndDate(date);
                    }}
                />
            )}

            {/* Summary Cards */}
            {!loading && (
                <View style={styles.summaryCards}>
                    <View style={styles.card}><Text>Total Doses: {summary.total}</Text></View>
                    <View style={styles.card}><Text>Taken: {summary.taken}</Text></View>
                    <View style={styles.card}><Text>Missed: {summary.missed}</Text></View>
                    <View style={styles.card}><Text>Adherence: {summary.adherenceRate}%</Text></View>
                </View>
            )}

            {/* Charts */}
            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} />
            ) : doseData.length === 0 ? (
                <Text style={{ marginTop: 20 }}>No dose data available in selected range.</Text>
            ) : (
                <>
                    <BarChart
                        data={{
                            labels: dataLabels.map((d) => dayjs(d).format('DD/MM')),
                            datasets: [{ data: doseData }],
                        }}
                        width={screenWidth - 32}
                        height={220}
                        fromZero
                        chartConfig={chartConfig}
                        style={{ marginVertical: 16, borderRadius: 16 }}
                        yAxisLabel=""
                        yAxisSuffix=""
                    />

                    <PieChart
                        data={[
                            {
                                name: 'Taken',
                                population: summary.taken,
                                color: '#4CAF50',
                                legendFontColor: '#333',
                                legendFontSize: 14,
                            },
                            {
                                name: 'Missed',
                                population: summary.missed,
                                color: '#F44336',
                                legendFontColor: '#333',
                                legendFontSize: 14,
                            },
                        ]}
                        width={screenWidth - 32}
                        height={180}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="16"
                        absolute
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
    quickRange: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    datePickers: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateButton: { flex: 1, marginHorizontal: 4 },
    summaryCards: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    card: {
        width: '48%',
        backgroundColor: '#f2f2f2',
        padding: 12,
        marginVertical: 6,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
});
