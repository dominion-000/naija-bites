process.env.PAYSTACK_SECRET_KEY = 'sk_test_dummy_for_tests';

jest.mock('axios');
const axios = require('axios');
const request = require('supertest');
const app = require('../src/app');

describe('GET /', () => {
  test('renders the chat page with the greeting server-rendered', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Welcome to Naija Bites/);
    expect(res.headers['set-cookie']).toBeDefined(); // device session cookie
  });
});

describe('POST /api/chat/message', () => {
  test('rejects a missing input with 400', async () => {
    const res = await request(app).post('/api/chat/message').send({});
    expect(res.status).toBe(400);
  });

  test('walks browsing -> add item -> checkout -> email -> pay, initializing payment', async () => {
    const agent = request.agent(app); // persists the session cookie across calls
    await agent.get('/'); // establishes the device session

    await agent.post('/api/chat/message').send({ input: '1' });
    await agent.post('/api/chat/message').send({ input: '3' }); // Fried Plantain
    const checkout = await agent.post('/api/chat/message').send({ input: '99' });
    expect(checkout.body.message).toMatch(/Order placed/);
    expect(checkout.body.message).toMatch(/What email/);

    const email = await agent.post('/api/chat/message').send({ input: 'customer@example.com' });
    expect(email.body.message).toMatch(/receipt goes to customer@example.com/);

    axios.post.mockResolvedValueOnce({
      data: { data: { authorization_url: 'https://paystack.test/pay/abc' } },
    });

    const res = await agent.post('/api/chat/message').send({ input: 'pay' });
    expect(res.status).toBe(200);
    expect(res.body.payment_url).toBe('https://paystack.test/pay/abc');
  });

  test('a failed Paystack call returns a friendly 502, not a crash', async () => {
    const agent = request.agent(app);
    await agent.get('/');
    await agent.post('/api/chat/message').send({ input: '1' });
    await agent.post('/api/chat/message').send({ input: '3' });
    await agent.post('/api/chat/message').send({ input: '99' });
    await agent.post('/api/chat/message').send({ input: 'customer@example.com' });

    axios.post.mockRejectedValueOnce(new Error('network down'));

    const res = await agent.post('/api/chat/message').send({ input: 'pay' });
    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/Could not start payment/);
  });
});
