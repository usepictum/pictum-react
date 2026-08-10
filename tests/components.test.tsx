import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import {
	Avatar,
	Icon,
	PictumProvider,
	Placeholder,
	QrCode,
	useAvatar,
} from "../src";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("components", () => {
	test("renders an inline icon and caches its canonical SVG", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke="currentColor" d="M1 1h22"/></svg>',
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		const screen = await render(
			<>
				<Icon
					name="lucide:test-icon"
					aria-label="Test icon"
					className="icon"
					options={{ baseUrl: "https://icons.example.com/v1" }}
				/>
				<Icon
					name="lucide:test-icon"
					aria-label="Second test icon"
					options={{ baseUrl: "https://icons.example.com/v1" }}
				/>
			</>,
		);

		await vi.waitFor(() => {
			expect(screen.container.querySelectorAll("svg path")).toHaveLength(2);
		});

		const svg = screen.container.querySelector("svg");
		expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
		expect(svg).toHaveAttribute("aria-label", "Test icon");
		expect(svg).toHaveClass("icon");
		expect(svg?.querySelector("path")).toHaveAttribute(
			"stroke",
			"currentColor",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("uses provider options and lets components override them", async () => {
		const screen = await render(
			<PictumProvider options={{ baseUrl: "https://staging.example.com/v1" }}>
				<Avatar seed="ada-lovelace" alt="Ada" />
				<QrCode
					value="hello"
					alt="Hello"
					options={{ baseUrl: "https://preview.example.com/v1" }}
				/>
			</PictumProvider>,
		);

		expect(screen.getByAltText("Ada")).toHaveAttribute(
			"src",
			"https://staging.example.com/v1/avatars/initials/ada-lovelace.svg",
		);
		expect(screen.getByAltText("Hello")).toHaveAttribute(
			"src",
			"https://preview.example.com/v1/qr-codes.svg?data=aGVsbG8%3D",
		);
	});

	test("merges provider and hook options with hook options taking precedence", async () => {
		function HookExample() {
			const inherited = useAvatar("ada-lovelace");
			const overridden = useAvatar("grace-hopper", {
				baseUrl: "https://preview.example.com/v1",
				format: "webp",
			});

			return (
				<>
					<span data-testid="inherited">{inherited.url}</span>
					<span data-testid="overridden">{overridden.url}</span>
				</>
			);
		}

		const screen = await render(
			<PictumProvider options={{ baseUrl: "https://staging.example.com/v1" }}>
				<HookExample />
			</PictumProvider>,
		);

		expect(screen.getByTestId("inherited")).toHaveTextContent(
			"https://staging.example.com/v1/avatars/initials/ada-lovelace.svg",
		);
		expect(screen.getByTestId("overridden")).toHaveTextContent(
			"https://preview.example.com/v1/avatars/initials/grace-hopper.webp",
		);
	});

	test("renders gendered realistic avatars", async () => {
		const screen = await render(
			<Avatar
				seed="customer-123"
				variant="realistic"
				gender="female"
				alt="Customer"
			/>,
		);

		expect(screen.getByAltText("Customer")).toHaveAttribute(
			"src",
			"https://pictum.dev/api/v1/avatars/realistic/female/customer-123.webp",
		);
	});

	test("forwards QR code quiet-zone options without leaking DOM attributes", async () => {
		const screen = await render(
			<QrCode value="hello" quietZone={false} alt="Hello without quiet zone" />,
		);

		const image = screen.getByAltText("Hello without quiet zone");
		expect(image).toHaveAttribute(
			"src",
			"https://pictum.dev/api/v1/qr-codes.svg?data=aGVsbG8%3D&quiet_zone=0",
		);
		expect(image).not.toHaveAttribute("quietzone");
	});

	test("sets placeholder logical image dimensions", async () => {
		const screen = await render(
			<Placeholder
				width={640}
				height={360}
				format="webp"
				density={3}
				text="Coming soon"
				alt="Coming soon"
			/>,
		);

		const image = screen.getByAltText("Coming soon");
		expect(image).toHaveAttribute("width", "640");
		expect(image).toHaveAttribute("height", "360");
		expect(image).toHaveAttribute(
			"src",
			"https://pictum.dev/api/v1/placeholders/640x360@3x.webp?text=Coming+soon",
		);
	});
});
