import { MarkerType } from "@xyflow/react";
import { SHAPE_SIZES, type CanvasShape } from "@/lib/canvas-shapes";
import { NODE_COLORS, type CanvasEdge, type CanvasNode } from "@/types/canvas";

export type CanvasTemplate = {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

function node(id: string, label: string, x: number, y: number, shape: CanvasShape = "rectangle", color = 1): CanvasNode {
  return { id, type: "canvasNode", position: { x, y }, ...SHAPE_SIZES[shape],
    data: { label, shape, color: NODE_COLORS[color].color, textColor: NODE_COLORS[color].textColor } };
}

function edge(source: string, target: string, sourceHandle = "right", targetHandle = "left"): CanvasEdge {
  return { id: `${source}-${target}`, type: "canvasEdge", source, target, sourceHandle, targetHandle,
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--canvas-edge-color)" } };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices", name: "Microservices", description: "API Gateway routes traffic to isolated services, each backed by a dedicated database and connected via a shared message bus.",
    nodes: [node("client", "Client", 0, 220, "pill", 1), node("gateway", "API Gateway", 260, 200, "rectangle", 7),
      node("bus", "Message Bus", 260, 440, "hexagon", 2),
      ...["Users", "Orders", "Payments", "Inventory"].flatMap((label, index) => [
        node(`service-${index}`, `${label} Service`, 540, index * 150, "rectangle", 2),
        node(`db-${index}`, `${label} DB`, 810, index * 150, "cylinder", 0),
      ])],
    edges: [edge("client", "gateway"), ...[0, 1, 2, 3].flatMap((index) => [edge("gateway", `service-${index}`), edge("bus", `service-${index}`), edge(`service-${index}`, `db-${index}`)])],
  },
  {
    id: "ci-cd", name: "CI/CD Pipeline", description: "End-to-end delivery from source commit through build, test, containerisation, and staged deployment to production.",
    nodes: [node("source", "Source Commit", 0, 0, "rectangle", 1), node("checkout", "Checkout", 280, 0, "rectangle", 7),
      node("build", "Build", 560, 0, "rectangle", 6), node("test", "Test", 840, 0, "rectangle", 2),
      node("container", "Containerise", 1120, 0, "rectangle", 2), node("staging", "Staging", 1400, 0, "rectangle", 3),
      node("approval", "Approval", 1680, -40, "diamond", 4), node("production", "Production", 1960, 0, "pill", 6)],
    edges: [edge("source", "checkout"), edge("checkout", "build"), edge("build", "test"), edge("test", "container"), edge("container", "staging"), edge("staging", "approval"), edge("approval", "production")],
  },
  {
    id: "event-driven", name: "Event-Driven System", description: "Producers publish events to a central bus. Independent consumers handle emails, push notifications, analytics, and error queues.",
    nodes: [...["Web App", "Mobile App", "API"].map((label, index) => node(`producer-${index}`, label, 0, index * 190, "pill", 1)),
      node("broker", "Event Bus", 300, 150, "hexagon", 2),
      ...["Email", "Push Notifications", "Analytics", "Error Queue"].map((label, index) => node(`consumer-${index}`, label, 600, index * 150, "rectangle", index === 3 ? 4 : 7)),
      ...["Email", "Push", "Analytics"].map((label, index) => node(`db-${index}`, `${label} DB`, 880, index * 150, "cylinder", 0))],
    edges: [...[0, 1, 2].map((index) => edge(`producer-${index}`, "broker")),
      ...[0, 1, 2, 3].map((index) => edge("broker", `consumer-${index}`)), ...[0, 1, 2].map((index) => edge(`consumer-${index}`, `db-${index}`))],
  },
];

// Fresh IDs and objects keep repeated imports isolated from earlier room history.
export function instantiateTemplate(template: CanvasTemplate): CanvasTemplate {
  const prefix = crypto.randomUUID();
  return {
    ...template,
    nodes: template.nodes.map((item) => ({ ...item, id: `${prefix}-${item.id}`, position: { ...item.position }, data: { ...item.data } })),
    edges: template.edges.map((item) => ({ ...item, id: `${prefix}-${item.id}`, source: `${prefix}-${item.source}`, target: `${prefix}-${item.target}`,
      data: item.data ? { ...item.data } : undefined })),
  };
}
