import { Op } from 'sequelize';
import { addHours } from 'date-fns';
import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';

import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';

class SubscriptionController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          required: true,
        },
      ],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);

    const meetup = await Meetup.findByPk(req.params.meetupId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exists.' });
    }

    // O usuário não pode se inscrever em meetups que já aconteceram.
    if (meetup.past) {
      return res.status(400).json({ error: 'Meetup has already been held.' });
    }

    // O usuário não deve poder se inscrever em meetups que organiza.
    if (meetup.user_id === req.userId) {
      return res
        .status(400)
        .json({ error: 'You cannot sign up for a meetup you have created.' });
    }

    const subscriptionExists = await Subscription.findOne({
      where: {
        user_id: req.userId,
        meetup_id: req.params.meetupId,
      },
    });

    // O usuário não pode se inscrever no mesmo meetup duas vezes.
    if (subscriptionExists) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    const conflictMeetups = await Subscription.findOne({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          required: true,
          where: {
            date: { [Op.between]: [meetup.date, addHours(meetup.date, 1)] },
          },
        },
      ],
    });

    // O usuário não pode se inscrever em dois meetups que acontecem no mesmo horário.
    if (conflictMeetups) {
      return res.status(400).json({
        error: 'You are already registered for a meeting at this time.',
        conflict: conflictMeetups,
      });
    }

    const subscription = await Subscription.create({
      user_id: req.userId,
      meetup_id: req.params.meetupId,
    });

    await Queue.add(SubscriptionMail.key, {
      meetup,
      user,
    });

    return res.json(subscription);
  }

  async teste(req, res) {
    const user = await User.findByPk(6);

    const meetup = await Meetup.findByPk(4, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
      ],
    });

    await Queue.add(SubscriptionMail.key, {
      meetup,
      user,
    });

    return res.json('subscription');
  }
}
export default new SubscriptionController();
