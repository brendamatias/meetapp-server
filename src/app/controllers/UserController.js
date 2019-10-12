import * as Yup from 'yup';
import User from '../models/User';

class UserController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string()
        .required('Name is required!')
        .max(250, 'Your name can not exceed 250 characters!'),
      email: Yup.string()
        .email()
        .required('Email is required!')
        .max(150, 'Your email can not exceed 150 characters!'),
      password: Yup.string()
        .required('Password is required!')
        .min(6, 'Your password must have at least 6 characters!')
        .max(20, 'Your password can not exceed 20 characters!'),
    });

    try {
      await schema.validate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.errors });
    }

    const userExists = await User.findOne({ where: { email: req.body.email } });

    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const { id, name, email } = await User.create(req.body);

    return res.json({
      id,
      name,
      email,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().max(250, 'Your name can not exceed 250 characters!'),
      email: Yup.string()
        .email()
        .max(150, 'Your email can not exceed 150 characters!'),
      oldPassword: Yup.string(),
      password: Yup.string()
        .min(6, 'Your password must have at least 6 characters!')
        .max(20, 'Your password can not exceed 20 characters!')
        .when('oldPassword', (oldPassword, field) =>
          /*
            Se a senha antiga for inserida a nova senha
            deverá ser required, se não, continua o field atual
          */
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when('password', (password, field) =>
        /*
          Se a senha nova for inserida a confirmação da senha
          deverá ser required e deverá ser igual ao password
          (campo de senha nova), se não, continua o field atual
        */
        password ? field.required().oneOf([Yup.ref('password')]) : field
      ),
    });

    try {
      await schema.validate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.errors });
    }

    const { email, oldPassword } = req.body;

    const user = await User.findByPk(req.userId);

    /*
      Caso o usuário tente alterar o e-mail deverá
      ser verificado se o novo e-mail já foi cadastrado
    */
    if (email && email !== user.email) {
      const userExists = await User.findOne({
        where: { email },
      });

      if (userExists) {
        return res
          .status(400)
          .json({ error: 'This e-mail is already being used!' });
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: 'Password does not match.' });
    }

    const { id, name } = await user.update(req.body);

    return res.json({
      id,
      name,
      email,
    });
  }
}

export default new UserController();
