import { BranchName, RoadStatus, ForestRoad } from './data/forestRoads';

export type { BranchName, RoadStatus, ForestRoad };

export interface FilterState {
  searchQuery: string;
  selectedBranch: BranchName | '全部';
  selectedStatus: RoadStatus | '全部';
}
