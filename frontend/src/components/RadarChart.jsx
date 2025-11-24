import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export function RadarChart({ data }) {
  const chartData = [
    { category: 'Normal', value: data.Normal },
    { category: 'SQLi', value: data.SQLi },
    { category: 'XSS', value: data.XSS },
    { category: 'Cmd Injection', value: data['Command Injection'] }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={chartData}>
        <PolarGrid strokeDasharray="3 3" stroke="#cbd5e1" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 1]}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
        />
        <Radar
          name="Probability"
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
          strokeWidth={2}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
