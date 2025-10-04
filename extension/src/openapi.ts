export default {
  openapi: "3.1.0",
  info: { title: "wedbav API Reference", description: "Development documentation", version: "1.0.0" },
  // components: { securitySchemes: { basicAuth: { type: "http", scheme: "basic" } } },
  // security: [{ basicAuth: [] }],
  // servers: [{ url: "http://localhost:3000", description: "Current server" }],
  paths: {
    "/api/v1/stat": {
      post: {
        operationId: "postApiV1Stat",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    type: {
                      anyOf: [
                        { type: "number", const: 1 },
                        { type: "number", const: 2 },
                      ],
                    },
                    ctime: { type: "number" },
                    mtime: { type: "number" },
                    size: { type: "number" },
                    permissions: { type: "number", const: 1 },
                  },
                  required: ["type", "ctime", "mtime", "size"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
            },
          },
        },
      },
    },
    "/api/v1/readDirectory": {
      post: {
        operationId: "postApiV1ReadDirectory",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: {
                        anyOf: [
                          { type: "number", const: 1 },
                          { type: "number", const: 2 },
                        ],
                      },
                    },
                    required: ["name", "type"],
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
            },
          },
        },
      },
    },
    "/api/v1/createDirectory": {
      post: {
        operationId: "postApiV1CreateDirectory",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                  required: ["success"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
            },
          },
        },
      },
    },
    "/api/v1/readFile": {
      post: {
        operationId: "postApiV1ReadFile",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean", const: true }, b64: { type: "string" } },
                  required: ["success", "b64"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "File not found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
            },
          },
        },
      },
    },
    "/api/v1/writeFile": {
      post: {
        operationId: "postApiV1WriteFile",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                  required: ["success"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "File not found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  b64: { type: "string" },
                  options: {
                    type: "object",
                    properties: { create: { type: "boolean" }, overwrite: { type: "boolean" } },
                    required: ["create", "overwrite"],
                  },
                },
                required: ["path", "b64"],
              },
            },
          },
        },
      },
    },
    "/api/v1/copy": {
      post: {
        operationId: "postApiV1Copy",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                  required: ["success"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  source: { type: "string" },
                  destination: { type: "string" },
                  options: {
                    type: "object",
                    properties: { overwrite: { type: "boolean" } },
                    required: ["overwrite"],
                  },
                },
                required: ["source", "destination"],
              },
            },
          },
        },
      },
    },
    "/api/v1/rename": {
      post: {
        operationId: "postApiV1Rename",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                  required: ["success"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  oldPath: { type: "string" },
                  newPath: { type: "string" },
                  options: {
                    type: "object",
                    properties: { overwrite: { type: "boolean" } },
                    required: ["overwrite"],
                  },
                },
                required: ["oldPath", "newPath"],
              },
            },
          },
        },
      },
    },
    "/api/v1/delete": {
      post: {
        operationId: "postApiV1Delete",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                  required: ["success"],
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
          "404": {
            description: "File not found",
            content: {
              "application/json": {
                schema: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  options: {
                    type: "object",
                    properties: { recursive: { type: "boolean" } },
                    required: ["recursive"],
                  },
                },
                required: ["path"],
              },
            },
          },
        },
      },
    },
  },
} as const;
