'use client';
import type { NumericKey, TextKey, KeysOfType } from './keys';
import {
  ObservationsCard,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { clusterConstellationLayout } from './spatial-point-layouts';
import { EmptyShapeContext } from '../lifecycle/chart-empty';
export { clusterConstellationLayout } from './spatial-point-layouts';

export interface ClusterConstellationCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  label: TextKey<Row>;
  x: NumericKey<Row>;
  y: NumericKey<Row>;
  z: NumericKey<Row>;
  value: Key;
  connections: KeysOfType<Row, readonly string[]>;
  group?: TextKey<Row>;
  yaw?: number;
  elevation?: number;
  size?: number;
}
const placeholderRows = [
  {
    name: 'Node 1',
    x: 50,
    y: 86,
    z: 50,
    value: 12,
    group: 'Platform',
    links: ['Node 4', 'Node 7'],
  },
  {
    name: 'Node 2',
    x: 76,
    y: 45,
    z: 76,
    value: 29,
    group: 'Experience',
    links: ['Node 5', 'Node 8'],
  },
  { name: 'Node 3', x: 15, y: 15, z: 89, value: 46, group: 'Growth', links: ['Node 6', 'Node 9'] },
  {
    name: 'Node 4',
    x: 70,
    y: 64,
    z: 85,
    value: 63,
    group: 'Platform',
    links: ['Node 7', 'Node 10'],
  },
  {
    name: 'Node 5',
    x: 58,
    y: 81,
    z: 63,
    value: 80,
    group: 'Experience',
    links: ['Node 8', 'Node 11'],
  },
  { name: 'Node 6', x: 19, y: 28, z: 36, value: 17, group: 'Growth', links: ['Node 9', 'Node 12'] },
  {
    name: 'Node 7',
    x: 83,
    y: 24,
    z: 15,
    value: 34,
    group: 'Platform',
    links: ['Node 10', 'Node 13'],
  },
  {
    name: 'Node 8',
    x: 37,
    y: 78,
    z: 11,
    value: 51,
    group: 'Experience',
    links: ['Node 11', 'Node 14'],
  },
  {
    name: 'Node 9',
    x: 35,
    y: 68,
    z: 25,
    value: 68,
    group: 'Growth',
    links: ['Node 12', 'Node 15'],
  },
  {
    name: 'Node 10',
    x: 84,
    y: 17,
    z: 51,
    value: 85,
    group: 'Platform',
    links: ['Node 13', 'Node 16'],
  },
  {
    name: 'Node 11',
    x: 20,
    y: 40,
    z: 76,
    value: 22,
    group: 'Experience',
    links: ['Node 14', 'Node 17'],
  },
  {
    name: 'Node 12',
    x: 56,
    y: 86,
    z: 90,
    value: 39,
    group: 'Growth',
    links: ['Node 15', 'Node 18'],
  },
  {
    name: 'Node 13',
    x: 72,
    y: 51,
    z: 84,
    value: 56,
    group: 'Platform',
    links: ['Node 16', 'Node 19'],
  },
  {
    name: 'Node 14',
    x: 15,
    y: 14,
    z: 63,
    value: 73,
    group: 'Experience',
    links: ['Node 17', 'Node 20'],
  },
  {
    name: 'Node 15',
    x: 75,
    y: 58,
    z: 35,
    value: 90,
    group: 'Growth',
    links: ['Node 18', 'Node 21'],
  },
  {
    name: 'Node 16',
    x: 52,
    y: 84,
    z: 15,
    value: 27,
    group: 'Platform',
    links: ['Node 19', 'Node 22'],
  },
  {
    name: 'Node 17',
    x: 23,
    y: 33,
    z: 11,
    value: 44,
    group: 'Experience',
    links: ['Node 20', 'Node 23'],
  },
  {
    name: 'Node 18',
    x: 84,
    y: 21,
    z: 25,
    value: 61,
    group: 'Growth',
    links: ['Node 21', 'Node 24'],
  },
  {
    name: 'Node 19',
    x: 31,
    y: 75,
    z: 51,
    value: 78,
    group: 'Platform',
    links: ['Node 22', 'Node 25'],
  },
  {
    name: 'Node 20',
    x: 40,
    y: 73,
    z: 77,
    value: 15,
    group: 'Experience',
    links: ['Node 23', 'Node 26'],
  },
  {
    name: 'Node 21',
    x: 82,
    y: 19,
    z: 90,
    value: 32,
    group: 'Growth',
    links: ['Node 24', 'Node 27'],
  },
  {
    name: 'Node 22',
    x: 18,
    y: 35,
    z: 84,
    value: 49,
    group: 'Platform',
    links: ['Node 25', 'Node 28'],
  },
  {
    name: 'Node 23',
    x: 61,
    y: 84,
    z: 62,
    value: 66,
    group: 'Experience',
    links: ['Node 26', 'Node 29'],
  },
  {
    name: 'Node 24',
    x: 67,
    y: 56,
    z: 35,
    value: 83,
    group: 'Growth',
    links: ['Node 27', 'Node 30'],
  },
  {
    name: 'Node 25',
    x: 16,
    y: 14,
    z: 14,
    value: 20,
    group: 'Platform',
    links: ['Node 28', 'Node 1'],
  },
  {
    name: 'Node 26',
    x: 78,
    y: 53,
    z: 11,
    value: 37,
    group: 'Experience',
    links: ['Node 29', 'Node 2'],
  },
  {
    name: 'Node 27',
    x: 46,
    y: 85,
    z: 26,
    value: 54,
    group: 'Growth',
    links: ['Node 30', 'Node 3'],
  },
  {
    name: 'Node 28',
    x: 27,
    y: 38,
    z: 52,
    value: 71,
    group: 'Platform',
    links: ['Node 1', 'Node 4'],
  },
  {
    name: 'Node 29',
    x: 85,
    y: 18,
    z: 77,
    value: 88,
    group: 'Experience',
    links: ['Node 2', 'Node 5'],
  },
  { name: 'Node 30', x: 27, y: 70, z: 90, value: 25, group: 'Growth', links: ['Node 3', 'Node 6'] },
];
export function ClusterConstellationCard<Row, const Key extends NumericKey<Row>>({
  label,
  x,
  y,
  z,
  value,
  connections,
  group,
  yaw,
  elevation,
  size,
  color,
  height = 360,
  depth = true,
  ...props
}: ClusterConstellationCardProps<Row, Key>) {
  const options = { group, yaw, elevation, size, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        depth={depth}
        height={height}
        color={color}
        family="cluster-constellation"
        layout={(data, width, h) =>
          clusterConstellationLayout(data, label, x, y, z, value, connections, width, h, options)
        }
        placeholder={(width, h) =>
          clusterConstellationLayout(
            placeholderRows,
            'name',
            'x',
            'y',
            'z',
            'value',
            'links',
            width,
            h,
            { ...options, group: 'group' },
          ) as unknown as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
