import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class MeetupController {
  async index(req, res) {
    const where = {};
    const page = req.query.page || 1;

    if (req.query.date) {
      const searchDate = parseISO(req.query.date);

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const meetups = await Meetup.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
      ],
      limit: 10,
      offset: 10 * page - 10,
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required('Title can not be empty!'),
      description: Yup.string().required('Description can not be empty!'),
      location: Yup.string().required('Location can not be empty!'),
      date: Yup.date().required('Date can not be empty.'),
      file_id: Yup.number().required('You must insert a banner for meetup!'),
    });

    try {
      await schema.validate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.errors });
    }

    const { title, description, location, date, file_id } = req.body;

    if (isBefore(parseISO(date), new Date())) {
      return res
        .status(400)
        .json({ error: 'Cannot insert an meetup to a passed date!' });
    }

    const meetup = await Meetup.create({
      title,
      description,
      location,
      date,
      user_id: req.userId,
      file_id,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required('Title can not be empty!'),
      description: Yup.string().required('Description can not be empty!'),
      location: Yup.string().required('Location can not be empty!'),
      date: Yup.date().required('Date can not be empty.'),
      file_id: Yup.number().required('You must insert a banner for meetup!'),
    });

    try {
      await schema.validate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.errors });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exists' });
    }

    if (meetup.past) {
      return res.status(400).json({ error: "Can't update past meetups." });
    }

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to update meetup from other users.",
      });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Past dates are not allowed' });
    }

    await meetup.update(req.body);

    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exists!' });
    }

    if (meetup.past) {
      return res
        .status(400)
        .json({ error: 'You can not delete a finished meetup!' });
    }

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to delete meetup from other users.",
      });
    }

    const subscriptions = await Subscription.findAll({ where: { meetup_id: meetup.id } });

    subscriptions.map(async subscription => {
      const user = await User.findByPk(subscription.user_id);

      await Queue.add(CancellationMail.key, {
        meetup,
        user,
      });
    });

    await meetup.destroy();

    return res.send();
  }
}
export default new MeetupController();
