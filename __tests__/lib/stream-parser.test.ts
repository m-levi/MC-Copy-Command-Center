import {
  parseJsonStream,
  createChunkedJsonFeeder,
} from '@/lib/chat/stream-parser';

describe('chat/stream-parser', () => {
  describe('parseJsonStream', () => {
    it('accumulates text deltas', () => {
      const payload =
        '{"type":"text","content":"Hello "}\n' +
        '{"type":"text","content":"world"}\n';
      const result = parseJsonStream(payload);
      expect(result.text).toBe('Hello world');
    });

    it('accumulates thinking deltas separately from text', () => {
      const payload =
        '{"type":"text","content":"visible"}\n' +
        '{"type":"thinking","content":"reasoning"}\n';
      const result = parseJsonStream(payload);
      expect(result.text).toBe('visible');
      expect(result.thinking).toBe('reasoning');
    });

    it('does not wipe accumulated text when thinking events arrive mid-stream (regression for "No content" bug)', () => {
      const textDeltas: string[] = [];
      const payload =
        '{"type":"text","content":"part 1 "}\n' +
        '{"type":"thinking","content":"mulling"}\n' +
        '{"type":"text","content":"part 2"}\n';
      parseJsonStream(payload, {
        onText: (_delta, accumulated) => textDeltas.push(accumulated),
      });
      // Every text callback should see a growing, never-shrinking string.
      expect(textDeltas).toEqual(['part 1 ', 'part 1 part 2']);
    });

    it('captures the latest status', () => {
      const payload =
        '{"type":"status","status":"analyzing_brand"}\n' +
        '{"type":"status","status":"thinking"}\n';
      const result = parseJsonStream(payload);
      expect(result.status).toBe('thinking');
    });

    it('captures product links', () => {
      const payload =
        '{"type":"products","products":[{"name":"Widget","url":"https://example.com/w"}]}\n';
      const result = parseJsonStream(payload);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].url).toBe('https://example.com/w');
    });

    it('ignores malformed JSON lines instead of throwing', () => {
      const payload =
        '{"type":"text","content":"ok"}\n' +
        'this is not json\n' +
        '{"type":"text","content":" again"}\n';
      const result = parseJsonStream(payload);
      expect(result.text).toBe('ok again');
    });

    it('ignores blank lines', () => {
      const payload =
        '\n{"type":"text","content":"a"}\n\n{"type":"text","content":"b"}\n';
      const result = parseJsonStream(payload);
      expect(result.text).toBe('ab');
    });

    it('ignores unknown event types without touching state', () => {
      const payload =
        '{"type":"artifact_created","artifactId":"x"}\n' +
        '{"type":"text","content":"copy"}\n';
      const result = parseJsonStream(payload);
      expect(result.text).toBe('copy');
    });

    it('exposes every parsed event via onEvent', () => {
      const events: string[] = [];
      parseJsonStream(
        '{"type":"text","content":"a"}\n{"type":"status","status":"x"}\n',
        {
          onEvent: (msg) => events.push(String(msg.type)),
        }
      );
      expect(events).toEqual(['text', 'status']);
    });
  });

  describe('createChunkedJsonFeeder', () => {
    it('buffers partial trailing lines across feeds (regression for regenerate stream parsing)', () => {
      const feeder = createChunkedJsonFeeder();
      feeder.feed('{"type":"text","content":"hel');
      expect(feeder.state.text).toBe('');
      feeder.feed('lo"}\n{"type":"text","conte');
      expect(feeder.state.text).toBe('hello');
      feeder.feed('nt":" world"}\n');
      expect(feeder.state.text).toBe('hello world');
    });

    it('flush consumes a trailing line with no newline', () => {
      const feeder = createChunkedJsonFeeder();
      feeder.feed('{"type":"text","content":"done"}');
      expect(feeder.state.text).toBe('');
      feeder.flush();
      expect(feeder.state.text).toBe('done');
    });

    it('interleaved text/thinking chunks preserve both streams', () => {
      const feeder = createChunkedJsonFeeder();
      feeder.feed('{"type":"text","content":"T1 "}\n');
      feeder.feed('{"type":"thinking","content":"R1 "}\n');
      feeder.feed('{"type":"text","content":"T2 "}\n');
      feeder.feed('{"type":"thinking","content":"R2"}\n');
      expect(feeder.state.text).toBe('T1 T2 ');
      expect(feeder.state.thinking).toBe('R1 R2');
    });
  });
});
