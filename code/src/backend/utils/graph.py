from pyvis.network import Network
import networkx as nx
import textwrap
import os

def write_html_utf8(net, output_file):
    html_content = net.generate_html()
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_content)

def similarity_to_color(similarity):
    if similarity > 0.85:
        return "green"
    elif similarity > 0.75:
        return "orange"
    else:
        return "gray"

def build_graph_html(selected_ids, nodes, edges, output_file="../../public/graph.html"):

    if selected_ids:
        # Compute similarity per selected paper
        related_scores = {}

        for sel_id in selected_ids:
            # Only consider edges above threshold
            similar = [(p1 if p2 == sel_id else p2, sim)
                       for p1, p2, sim in edges
                       if sel_id in (p1, p2) and (p1 != p2) and sim > 0.65]

            top_similar = sorted(similar, key=lambda x: x[1], reverse=True)[:5]

            for pid, sim in top_similar:
                related_scores[pid] = max(related_scores.get(pid, 0), sim)

        # Filter nodes to selected + top related
        relevant_ids = set(selected_ids) | set(related_scores.keys())
        # print(f"Relevant nodes: {relevant_ids}")
        # print(f"Nodes keys before: {nodes.keys()}")
        nodes = {k: v for k, v in nodes.items() if k in relevant_ids}
        # print(f"Nodes keys after: {nodes.keys()}")

        # Only keep edges between relevant_ids and above threshold
        edges = [
            (p1, p2, sim) for p1, p2, sim in edges
            if p1 in relevant_ids and p2 in relevant_ids and sim > 0.65
        ]

    G = nx.Graph()
    for paper_id in nodes:
        G.add_node(paper_id,
              label = f"Paper {paper_id}",
              abstract = nodes[paper_id]["summary"],
              title = nodes[paper_id]["title"])
        
    for paper1, paper2, sim in edges:
        G.add_edge(paper1, paper2, weight=sim)

    net = Network(height='600px', width='100%', notebook=True, cdn_resources='in_line')

    for node_id, data in G.nodes(data=True):
        label = data.get("label", f"Paper {node_id}")
        abstract = data.get("abstract", "No abstract available.")
        paper_title = data.get("title", "No title")

        wrapped_abstract = "Title: " + str(paper_title) + "\nSummary: " + str("\n".join(textwrap.wrap(abstract, width=80)))
         
        color = "red" if node_id in selected_ids else "lightblue"

        net.add_node(node_id, 
                     label = label, 
                     title = wrapped_abstract,
                     color = color,
                     shape = "ellipse",
                     font = {"size": 24 if node_id in selected_ids else 22})

    for source, target, data in G.edges(data=True):
        similarity = float(data.get("weight", 0))
        net.add_edge(source, 
            target, 
            value=similarity * 10,
            title=f"Similarity: {similarity:.2f}",
            color=similarity_to_color(similarity))


    os.makedirs(os.path.dirname(output_file), exist_ok = True)
    write_html_utf8(net, output_file)