-- Карточку чеклиста можно удалить из чата (меню «⋮» на карточке). Удаляет любой из двух участников, исчезает у обоих.
-- Копия чеклиста у получателя при этом не трогается: её удаляет сам владелец (приложение делает это одним действием,
-- если карточку удаляет получатель). Обычные текстовые сообщения, как и раньше, не удаляются.

create policy chat_messages_delete on chat_messages for delete to authenticated
  using (
    kind = 'checklist'
    and exists (select 1 from chats c where c.id = chat_id and auth.uid() in (c.user_a, c.user_b))
  );
