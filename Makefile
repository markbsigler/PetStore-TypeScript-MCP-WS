# Makefile for PetStore-TypeScript-MCP-WS

.PHONY: dev setup

dev:
	npm install
	cp -n .env.example .env || true
	npm run dev

setup:
	npm install
	cp -n .env.example .env || true
