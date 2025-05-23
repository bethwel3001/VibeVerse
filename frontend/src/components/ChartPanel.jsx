import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ChartPanel = ({ data }) => {
  return (
    <div className="glass rounded-lg p-4 w-full">
      <h3 className="text-xl font-semibold mb-2">Listening Habits</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartPanel;
