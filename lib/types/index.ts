export type BoardType = "CLOUD_SOLAR" | "PAYGO" | "INNOVEX";
export type Role = "ADMIN" | "MANAGER" | "VIEWER";
export type AssignmentStatus = "FREE" | "ASSIGNED";

export type DeviceStatus = "active" | "inactive" | "error";
export type TokenType = "SET_TIME" | "ADD_TIME" | "DISABLE";

export type ParsedToken = {
	tokenType: TokenType;
	value: number;
	count: number;
};

export type IngestionStatus = "success" | "partial" | "failed";

export type IngestionResult = {
	provider: "cloud_solar" | "innovex";
	deviceId: number;
	recordCount: number;
	errorCount: number;
	duration: number;
	status: IngestionStatus;
	errors: string[];
};
