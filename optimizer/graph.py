import networkx as nx
import pandas as pd
from typing import List, Tuple, Dict


class TaskGraphBuilder:
    def __init__(self, tasks_df: pd.DataFrame):
        self.tasks_df = tasks_df
        self.graph = nx.Graph()
        self._build_graph()

    def _build_graph(self):
        # Add all tasks as nodes with metadata
        for _, row in self.tasks_df.iterrows():
            self.graph.add_node(
                row['id'],
                department=row['department'],
                section_id=row['section_id'],
                duration_minutes=int(row['duration_minutes']),
                criticality=int(row['criticality']),
                due_date=str(row['due_date'])
            )

        # Detect Synergies and Conflicts across tasks
        nodes = list(self.graph.nodes(data=True))
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                u_id, u_data = nodes[i]
                v_id, v_data = nodes[j]

                # Only tasks on the same section can have direct operational edges
                if u_data['section_id'] == v_data['section_id']:
                    
                    # Rule 1: TRD Power Isolation Conflict
                    if (u_data['department'] == 'TRD' and v_data['department'] != 'TRD') or \
                       (v_data['department'] == 'TRD' and u_data['department'] != 'TRD'):
                        self.graph.add_edge(u_id, v_id, relation_type='CONFLICT', reason='TRD Power Isolation Conflict')

                    # Rule 2: Engineering + S&T Bundling Synergy
                    elif (u_data['department'] == 'Engineering' and v_data['department'] == 'S&T') or \
                         (u_data['department'] == 'S&T' and v_data['department'] == 'Engineering'):
                        self.graph.add_edge(u_id, v_id, relation_type='SYNERGY', reason='Engineering & S&T Co-location Synergy')

    def get_synergies(self) -> List[Tuple[str, str, str]]:
        synergies = []
        for u, v, data in self.graph.edges(data=True):
            if data.get('relation_type') == 'SYNERGY':
                synergies.append((u, v, data['reason']))
        return synergies

    def get_conflicts(self) -> List[Tuple[str, str, str]]:
        conflicts = []
        for u, v, data in self.graph.edges(data=True):
            if data.get('relation_type') == 'CONFLICT':
                conflicts.append((u, v, data['reason']))
        return conflicts


if __name__ == "__main__":
    df = pd.read_csv("data/sample_dataset.csv")
    builder = TaskGraphBuilder(df)
    
    print("=== GRAPH CONSTRUCTION AUDIT ===")
    print(f"Total Task Nodes: {builder.graph.number_of_nodes()}")
    print("\n--- Detected Synergies ---")
    for u, v, reason in builder.get_synergies():
        print(f"  [+] Synergy: {u} <---> {v} | Reason: {reason}")
        
    print("\n--- Detected Conflicts ---")
    for u, v, reason in builder.get_conflicts():
        print(f"  [-] Conflict: {u} <---> {v} | Reason: {reason}")
