import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, Tooltip } from 'recharts';

interface FocusChartProps {
  focus_pct: number;
}

const data = [{
  name: 'Focus',
  uv: 0,
  fill: '#8884d8'
}];

const FocusChart: React.FC<FocusChartProps> = ({ focus_pct }) => {
  const chartData = [{ ...data[0], uv: focus_pct * 100 }];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" align="center" gutterBottom>
          Focus Percentage
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="80%"
            barSize={10}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis 
              type="number" 
              domain={[0, 100]} 
              angleAxisId={0} 
              tick={false} 
            />
            <RadialBar 
            // @ts-ignore
              minAngle={15} 
              label={{ position: 'insideStart', fill: '#fff' }} 
              background 
              clockWise 
              dataKey="uv" 
            />
            <Tooltip />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="progress-label"
              fontSize="24"
              fontWeight="bold"
            >
              {`${(focus_pct * 100).toFixed(0)}%`}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FocusChart;