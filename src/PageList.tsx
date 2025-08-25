"use client";

import React, { useState, useMemo } from "react";
import { WikiPage } from "./types";
import { useRouter } from "next/navigation";
import { useUser } from "./userContext";

interface TreeNode {
  name: string;
  path: string;
  page?: WikiPage;
  children: TreeNode[];
  isExpanded: boolean;
}

function buildTree(pages: WikiPage[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    children: [],
    isExpanded: true,
  };

  pages.forEach((page) => {
    const pathParts = page.path.split('/').filter(Boolean);
    let currentNode = root;

    // Special case: if path is just "/" (root), add directly to root
    if (pathParts.length === 0) {
      currentNode.children.push({
        name: page.title,
        path: page.path,
        page,
        children: [],
        isExpanded: false,
      });
      return;
    }

    // Navigate/create the folder structure for ALL path parts
    // Each path part represents a folder that the page should be in
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const partPath = '/' + pathParts.slice(0, i + 1).join('/');
      
      let childNode = currentNode.children.find(child => child.name === part && !child.page);
      if (!childNode) {
        childNode = {
          name: part,
          path: partPath,
          children: [],
          isExpanded: false,
        };
        currentNode.children.push(childNode);
      }
      currentNode = childNode;
    }

    // Add the page as a leaf node in the deepest folder
    currentNode.children.push({
      name: page.title, // Use the actual page title instead of path segment
      path: page.path,
      page,
      children: [],
      isExpanded: false,
    });
  });

  // Sort children: folders first, then pages, both alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (!a.page && b.page) return -1; // folder before page
      if (a.page && !b.page) return 1;  // page after folder
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  
  sortChildren(root);
  return root;
}

function TreeNodeComponent({
  node,
  level,
  selectedId,
  onToggle,
  onPageClick,
}: {
  node: TreeNode;
  level: number;
  selectedId: number | null;
  onToggle: (path: string) => void;
  onPageClick: (pageId: number) => void;
}) {
  const isFolder = !node.page;
  const hasChildren = node.children.length > 0;
  const isSelected = node.page?.id === selectedId;

  return (
    <>
      <li>
        <div
          className={`flex items-center py-1 px-2 rounded transition cursor-pointer ${
            isSelected
              ? "bg-indigo-800 text-indigo-100"
              : "text-indigo-300 hover:bg-gray-700"
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              onToggle(node.path);
            } else if (node.page) {
              onPageClick(node.page.id);
            }
          }}
        >
          {isFolder ? (
            <>
              <span className="text-xs mr-1 w-4 text-center">
                {hasChildren ? (node.isExpanded ? "📂" : "📁") : "📁"}
              </span>
              <span className="font-medium truncate">{node.name}</span>
            </>
          ) : (
            <>
              <span className="text-xs mr-1 w-4 text-center">📄</span>
              <span className="font-medium truncate">{node.name}</span>
            </>
          )}
        </div>
      </li>
      {isFolder && node.isExpanded && hasChildren && (
        <>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onToggle={onToggle}
              onPageClick={onPageClick}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function PageList({
  pages,
  selectedId,
  onClose,
}: {
  pages: WikiPage[];
  selectedId: number | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const treeRoot = buildTree(pages);
    
    // Auto-expand path to selected page
    if (selectedId) {
      const selectedPage = pages.find(p => p.id === selectedId);
      if (selectedPage) {
        const pathParts = selectedPage.path.split('/').filter(Boolean);
        const newExpanded = new Set(expandedPaths);
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          const partialPath = '/' + pathParts.slice(0, i + 1).join('/');
          newExpanded.add(partialPath);
        }
        
        if (newExpanded.size !== expandedPaths.size) {
          setExpandedPaths(newExpanded);
        }
      }
    }

    // Apply expansion state to tree
    const applyExpansion = (node: TreeNode) => {
      if (!node.page) {
        node.isExpanded = expandedPaths.has(node.path);
      }
      node.children.forEach(applyExpansion);
    };
    
    applyExpansion(treeRoot);
    return treeRoot;
  }, [pages, expandedPaths, selectedId]);

  const handleToggle = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handlePageClick = (pageId: number) => {
    router.push(`/pages/${pageId}`);
    // Close sidebar on mobile when page is selected
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-full h-full bg-gray-900/80 border-r border-gray-800 overflow-y-auto p-4 flex flex-col overscroll-contain">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-indigo-200 flex items-center gap-2">
          Pages
          {user.id !== "anonymous" && (
            <button
              onClick={() => router.push("/pages/create")}
              className="bg-green-700 text-white px-2 py-1 rounded text-xs font-semibold shadow hover:bg-green-800 transition"
            >
              + New
            </button>
          )}
        </h3>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <ul className="space-y-0.5 flex-1 min-h-0 overflow-y-auto">
        {tree.children.map((child) => (
          <TreeNodeComponent
            key={child.path}
            node={child}
            level={0}
            selectedId={selectedId}
            onToggle={handleToggle}
            onPageClick={handlePageClick}
          />
        ))}
      </ul>
    </aside>
  );
}
